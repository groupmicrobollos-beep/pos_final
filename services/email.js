const { Resend } = require('resend');
const dotenv = require('dotenv');

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!process.env.RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY is not set. Email recovery will not work.");
}

async function sendPasswordResetEmail(email, token) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing. Cannot send email.");
        return { error: "Configuration error" };
    }

    const resetLink = `${process.env.FRONTEND_URL || 'https://microbollosgroup.onrender.com'}/?reset_token=${token}#login`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Microbollos <onboarding@resend.dev>', // Update this if user has a verified domain
            to: [email],
            subject: 'Restablecer Contraseña',
            html: `
                <h1>Restablecimiento de Contraseña</h1>
                <p>Has solicitado restablecer tu contraseña.</p>
                <p>Haz clic en el siguiente enlace para continuar:</p>
                <a href="${resetLink}">Restablecer Contraseña</a>
                <p>Si no solicitaste esto, ignora este correo.</p>
                <p>El enlace expira en 1 hora.</p>
            `,
        });

        if (error) {
            console.error("Resend error:", error);
            return { error };
        }

        console.log("Email sent successfully to:", email);
        return { data };
    } catch (err) {
        console.error("Email sending failed:", err);
        return { error: err };
    }
}

module.exports = { sendPasswordResetEmail };
