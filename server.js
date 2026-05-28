const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = 3000;
const ARCHIVO_DB = path.join(__dirname, 'usuarios.json');

// Token Real Vinculado Correctamente con comillas
const mpClient = new MercadoPagoConfig({ accessToken: 'APP_USR-6799430940471481-052722-510a9223d983b350f3f91b99eb083c67-3432219958' });

// Configuración para leer formularios y archivos visuales
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Escudos de Ciberseguridad
app.use(helmet());
const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: '🔒 Demasiados intentos desde esta IP. Bloqueado por seguridad.'
});
app.use('/api/', limitador);

// Funciones de Base de Datos local
function obtenerUsuarios() {
    if (!fs.existsSync(ARCHIVO_DB)) {
        fs.writeFileSync(ARCHIVO_DB, JSON.stringify({}));
    }
    const datos = fs.readFileSync(ARCHIVO_DB, 'utf-8');
    return JSON.parse(datos);
}

function guardarUsuarios(usuarios) {
    fs.writeFileSync(ARCHIVO_DB, JSON.stringify(usuarios, null, 2));
}

// Registro de usuarios
app.post('/api/registrar', async (req, res) => {
    try {
        const { nombre, password, plan } = req.body;
        if (!nombre || !password) return res.send('Por favor llena todos los campos.');
        
        const usuarios = obtenerUsuarios();
        if (usuarios[nombre]) return res.send('El nombre de usuario ya está registrado.');
        
        const passwordSegura = await bcrypt.hash(password, 10);
        usuarios[nombre] = { password: passwordSegura, nivel: plan };
        guardarUsuarios(usuarios);
        
        res.send(`
            <div style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding:50px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h2 style="color:#00f2fe; font-size:32px; margin-bottom:10px;">🛡️ Cuenta Guardada</h2>
                <p style="color:#94a3b8; font-size:18px; margin-bottom:30px;">Perfil de <b>${nombre}</b> almacenado en nivel: <b>${plan.toUpperCase()}</b></p>
                <a href="/" style="background:linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color:#0b0f19; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Regresar</a>
            </div>
        `);
    } catch (error) {
        res.status(500).send('Error interno de seguridad.');
    }
});

// Login de usuarios
app.post('/api/login', async (req, res) => {
    try {
        const { nombre, password } = req.body;
        const usuarios = obtenerUsuarios();
        const user = usuarios[nombre];

        if (!user) return res.send('⚠️ Usuario o contraseña incorrectos.');

        const coinciden = await bcrypt.compare(password, user.password);
        if (!coinciden) return res.send('⚠️ Usuario o contraseña incorrectos.');

        res.send(`
            <div style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding:50px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h2 style="color:#00f2fe; font-size:32px; margin-bottom:10px;">🔓 Acceso Autorizado</h2>
                <p style="color:#94a3b8; font-size:18px; margin-bottom:30px;">¡Bienvenido, <b>${nombre}</b>!</p>
                <a href="/" onclick="localStorage.setItem('usuario_forgemind', '${nombre}')" style="background:linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color:#0b0f19; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Entrar</a>
            </div>
        `);
    } catch (error) {
        res.status(500).send('Error interno en el login.');
    }
});

// Pasarela de Cobro Automática Completa
// Pasarela de Cobro Automática Completa sin restricción de auto_return
app.post('/api/checkout', async (req, res) => {
    try {
        const { plan, precio, usuario } = req.body;
        if (!usuario) return res.send('⚠️ Por favor, inicia sesión antes de comprar.');

        const preference = new Preference(mpClient);

        const resultado = await preference.create({
            body: {
                items: [{
                    title: `Membresía ForgeMind: Nivel ${plan.toUpperCase()}`,
                    quantity: 1,
                    unit_price: parseFloat(precio),
                    currency_id: 'MXN'
                }],
                                back_urls: {
                    success: 'https://mercadopago.com',
                    failure: 'https://mercadopago.com',
                    pending: 'https://mercadopago.com'
                }

            }
        });

        res.redirect(resultado.init_point);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al procesar la orden de pago.');
    }
});


// Éxito tras el pago
app.get('/exito', (req, res) => {
    const { usuario, plan } = req.query;
    const usuarios = obtenerUsuarios();

    if (usuarios[usuario]) {
        usuarios[usuario].nivel = plan;
        guardarUsuarios(usuarios);
    }

    res.send(`
        <body style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
            <h1 style="color:#00f2fe;">💰 ¡Pago Confirmado!</h1>
            <p>Tu cuenta ha sido activada en el nivel: <b>${plan.toUpperCase()}</b></p>
            <a href="/" style="color:#00f2fe; font-weight:bold; text-decoration:none; background:#1e293b; padding:10px 20px; border-radius:8px;">Regresar al Laboratorio</a>
        </body>
    `);
});

// Rutas de Contenido
app.get('/contenido/:proyectoId', (req, res) => {
    const usuarioId = req.query.usuario; 
    const usuarios = obtenerUsuarios();
    const user = usuarios[usuarioId];

    if (!user || (user.nivel !== 'basico' && user.nivel !== 'pro')) {
        return res.status(403).send(`
            <body style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h1>Contenido Bloqueado 🔒</h1>
                <p>Requiere plan <b>Maker ($80)</b> o <b>Developer ($150)</b>.</p>
                <a href="/" style="color:#00f2fe;">Volver</a>
            </body>
        `);
    }

    res.send(`
        <body style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding:40px;">
            <h1>⚙️ Modo Aprendizaje Activado</h1>
            <video width="600" controls autoplay style="border: 2px solid #00f2fe; border-radius:12px;">
                <source src="/video-tutorial.mp4" type="video/mp4">
            </video>
            <h2>📖 Guía de Construcción</h2>
            <p>Paso 1: Cortar la estructura base... Paso 2: Ensamblar los tensores...</p>
        </body>
    `);
});

app.get('/herramientas/:proyectoId', (req, res) => {
    const usuarioId = req.query.usuario;
    const usuarios = obtenerUsuarios();
    const user = usuarios[usuarioId];

    if (!user) {
        return res.status(403).send(`
            <body style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h1>¿Te falta esta herramienta? 🛠️</h1>
                <p>Adquiere el acceso individual por solo <b>$20 pesos</b> creando una cuenta Express.</p>
                <a href="/" style="color:#00f2fe;">Volver</a>
            </body>
        `);
    }

    res.send(`
        <body style="background:#0b0f19; color:white; font-family:sans-serif; text-align:center; padding:40px;">
            <h1>🛠️ Enlaces de Compra Autorizados</h1>
            <ul>
                <li><a href="https://amazon.com" target="_blank" style="color:#00f2fe;">Comprar Taladro Eléctrico Profesional</a></li>
            </ul>
        </body>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo corriendo en http://localhost:${PORT}`);
});

