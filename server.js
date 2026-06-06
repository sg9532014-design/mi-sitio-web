const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_TOKEN });

// URLs de tu proyecto
const FRONTEND_URL = "https://forgemind-lf3.onrender.com";

app.use(cors({ origin: '*' })); // Permite peticiones desde cualquier origen
app.use(bodyParser.json());
app.use(express.json());

// Sirve los archivos estáticos
app.use(express.static(path.join(__dirname, '.')));

let usuarios = [];

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Registro
app.post('/api/registrar', (req, res) => {
    const { username, password, plan } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña requeridos' });

    const usuarioExiste = usuarios.find(u => u.username === username);
    if (usuarioExiste) return res.status(400).json({ message: 'El usuario ya existe' });

    usuarios.push({ username, password, plan });
    res.status(200).json({ message: 'Usuario creado con éxito' });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const usuario = usuarios.find(u => u.username === username && u.password === password);
    if (usuario) {
        res.status(200).json({ message: 'Bienvenido ' + username });
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

// Pagos
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio, usuario } = req.body;
        
        if (!process.env.MERCADOPAGO_TOKEN) {
            return res.status(500).json({ message: 'Falta el token de Mercado Pago en las variables de entorno' });
        }

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ 
                    title: nombre_guia, 
                    quantity: 1, 
                    unit_price: Number(precio), 
                    currency_id: 'MXN' 
                }],
                back_urls: {
                    success: FRONTEND_URL,
                    failure: FRONTEND_URL,
                    pending: FRONTEND_URL
                },
                auto_return: 'approved',
                metadata: { 
                    usuario: usuario, 
                    id_guia: id_guia 
                }
            }
        });
        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error("Error Mercado Pago:", error);
        res.status(500).json({ message: 'Error al procesar el pago', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ForgeMind corriendo en puerto ${PORT}`);
});
