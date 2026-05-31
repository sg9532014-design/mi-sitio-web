const express = require('express');
const app = express();
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Habilitar que el servidor entienda datos en formato JSON
app.use(express.json());

// Servir los archivos estáticos de tu diseño desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Mercado Pago usando tu variable segura en internet
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_TOKEN 
});

// RUTA 1: Para mostrar la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// RUTA 2: EL MOTOR DE COBROS REALES
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio } = req.body;

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [
                    {
                        title: nombre_guia,
                        quantity: 1,
                        unit_price: Number(precio),
                        currency_id: 'MXN' // Pesos Mexicanos
                    }
                ],
                back_urls: {
                    success: 'https://onrender.com',
                    failure: 'https://onrender.com',
                    pending: 'https://onrender.com'
                },
                auto_return: 'approved',
            }
        });

        // Enviamos el enlace de pago seguro generado por Mercado Pago
        res.json({ id: response.id, init_point: response.init_point });
    } catch (error) {
        console.error('Error en Mercado Pago:', error);
        res.status(500).json({ error: 'Error al procesar el botón de pago' });
    }
});

// Arrancar el servidor definitivo en internet o local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor definitivo corriendo en http://localhost:${PORT}`);
});
