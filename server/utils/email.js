import nodemailer from "nodemailer";
import dotenv from 'dotenv';



let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
};

export const sendEmailOtp = async (email, otp) => {
    const mailTransporter = getTransporter();
    await mailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "OTP Verification",
        text: `Your OTP is ${otp}`
    });
};

export const sendCartAddEmail = async (email, productName) => {
    try {
        const mailTransporter = getTransporter();
        await mailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Item Added to Cart - GMD Marketplace",
            text: `Hi there!\n\nYou have successfully added "${productName}" to your shopping cart on GMD Home-Products.\n\nBrowse more products or go to your cart to complete your checkout!\n\nBest regards,\nGMD Home-Products Team`
        });
    } catch (err) {
        console.error("[EMAIL ERROR] Failed to send cart addition email:", err.message);
    }
};

export const sendOrderConfirmationEmail = async (email, { orderId, totalAmount, paymentMethod, customerName }) => {
    try {
        const mailTransporter = getTransporter();
        await mailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Order Confirmation - Order #${orderId.toUpperCase().slice(0, 8)}`,
            text: `Hi ${customerName},\n\nThank you for shopping with us! Your order has been placed successfully.\n\nOrder Details:\n- Order ID: #${orderId.toUpperCase()}\n- Total Amount: ₹${totalAmount}\n- Payment Method: ${paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment'}\n\nWe are preparing your items and will notify you as soon as they are shipped!\n\nBest regards,\nGMD Home-Products Team`
        });
    } catch (err) {
        console.error("[EMAIL ERROR] Failed to send order confirmation email:", err.message);
    }
};
