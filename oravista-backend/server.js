const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); 
const crypto = require('crypto'); 
const multer = require('multer'); 
const path = require('path');     
const fs = require('fs');         
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ---------------------------------------------------------
// DATABASE CONNECTION 
// ---------------------------------------------------------
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: 'root', 
    database: 'oravistadbm'
});

// ---------------------------------------------------------
// EMAIL TRANSPORTER SETUP
// ---------------------------------------------------------
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'profile_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const recordStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'record_' + Date.now() + path.extname(file.originalname))
});
const uploadRecord = multer({ storage: recordStorage });

// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: "Invalid email or password." });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 5 * 60000);

        await db.promise().query('UPDATE users SET current_otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiryDate, user.id]);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, 
            subject: 'OraVista - Login Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
                    <h2 style="color: #111827;">King Epres Dental Clinic</h2>
                    <p>Hello ${user.first_name},</p>
                    <p>This is a login verification code. Enter it to gain access.</p>
                    <h1 style="background: #1F2937; color: #FFFFFF; padding: 15px 25px; display: inline-block; letter-spacing: 8px; border-radius: 6px;">${otp}</h1>
                </div>`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body; 
    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: "User not found." });
        const user = users[0];
        if (user.current_otp !== otp) return res.status(401).json({ message: "Invalid verification code." });
        if (new Date() > new Date(user.otp_expiry)) return res.status(401).json({ message: "Code has expired." });

        await db.promise().query('UPDATE users SET current_otp = NULL, otp_expiry = NULL WHERE id = ?', [user.id]);
        res.status(200).json({ message: "Verified", token: "logged_in_token", user });
    } catch (err) { res.status(500).json({ message: "Server error." }); }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email, action } = req.body; 
    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: "Email not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 10 * 60000);
        await db.promise().query('UPDATE users SET current_otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiryDate, users[0].id]);

        let emailSubject = 'OraVista - Verification Code';
        let emailBody = 'Please use the verification code below to proceed.';
        
        if (action === 'change') {
            emailSubject = 'OraVista - Change Password Request';
            emailBody = 'You requested to change your password from settings. Use this code to authorize the change.';
        } else {
            emailSubject = 'OraVista - Forgot Password Request';
            emailBody = 'Use this code to recover your account and set a new password.';
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: emailSubject,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
                    <h2>King Epres Dental Clinic</h2>
                    <p>Hello ${users[0].first_name},</p>
                    <p>${emailBody}</p>
                    <h1 style="background: #1F2937; color: #FFFFFF; padding: 15px 25px; display: inline-block; letter-spacing: 8px;">${otp}</h1>
                </div>`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (err) { res.status(500).json({ message: "Server error." }); }
});

app.post('/api/verify-current-password', async (req, res) => {
    const { id, password } = req.body;
    try {
        const [users] = await db.promise().query('SELECT password FROM users WHERE id = ?', [id]);
        const isMatch = await bcrypt.compare(password, users[0].password);
        if (isMatch) res.status(200).json({ message: "Valid" });
        else res.status(401).json({ message: "Incorrect current password." });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

app.put('/api/update-password', async (req, res) => {
    const { id, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (err) { res.status(500).json({ message: "Database update failed." }); }
});

app.put('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.promise().query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        res.status(200).json({ message: "Password reset successful!" });
    } catch (err) { res.status(500).json({ message: "Server error." }); }
});

// ---------------------------------------------------------
// REGISTRATION ROUTE (UPDATED: Includes Phone)
// ---------------------------------------------------------
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body; 

    try {
        const [existingUsers] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.promise().query(
            'INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)', 
            [firstName, lastName, email, phone, hashedPassword]
        );

        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Server error during registration." });
    }
});

app.put('/api/update-profile', async (req, res) => {
    const { id, firstName, lastName, email, sex, dob, age, phone, occupation, blood_type, allergies, insurance, policy_number } = req.body;
    try {
        const query = `UPDATE users SET first_name = ?, last_name = ?, email = ?, sex = ?, dob = ?, age = ?, phone = ?, occupation = ?, blood_type = ?, allergies = ?, insurance = ?, policy_number = ? WHERE id = ?`;
        await db.promise().query(query, [firstName, lastName, email, sex, dob, age, phone, occupation, blood_type, allergies, insurance, policy_number, id]);
        res.status(200).json({ message: "Profile updated!" });
    } catch (err) { res.status(500).json({ message: "Failed update." }); }
});

app.get('/api/user-billings/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // 🚀 UPDATED: Added "invoice_path" to the SELECT query
        const [records] = await db.promise().query('SELECT id, title, amount, status, DATE_FORMAT(date, "%M %d, %Y") as date, invoice_path FROM billings WHERE user_id = ? ORDER BY date DESC', [userId]);
        const [balanceRow] = await db.promise().query('SELECT SUM(amount) as total FROM billings WHERE user_id = ? AND status = "Pending"', [userId]);
        res.status(200).json({ records, totalOutstanding: balanceRow[0].total || 0 });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/book-appointment', async (req, res) => {
    const { user_id, service_type, dentist_name, appointment_date, appointment_time } = req.body;
    try {
        const booking_ref = `OV - ${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await db.promise().query(`INSERT INTO appointments (user_id, booking_ref, service_type, dentist_name, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, [user_id, booking_ref, service_type, dentist_name, appointment_date, appointment_time, 'Pending']);
        res.status(201).json({ message: "Booked!", booking_ref });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/user-appointments/:userId', async (req, res) => {
    try {
        const [results] = await db.promise().query('SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date DESC', [req.params.userId]);
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

// 🚀 NEW: Update Appointment Status Route (For Cancellation)
app.put('/api/update-appointment-status', async (req, res) => {
    const { appointment_id, status } = req.body;
    try {
        await db.promise().query(
            'UPDATE appointments SET status = ? WHERE id = ?', 
            [status, appointment_id]
        );
        res.status(200).json({ message: "Appointment status updated!" });
    } catch (err) {
        console.error("Update Appointment Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

app.get('/api/patient-records/:userId', async (req, res) => {
    try {
        const [records] = await db.promise().query('SELECT id, file_name, file_path, upload_date FROM patient_records WHERE user_id = ? ORDER BY upload_date DESC', [req.params.userId]);
        res.status(200).json(records);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/user-profile', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: "Not found" });
        const user = users[0]; delete user.password; 
        res.status(200).json(user);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`OraVista Backend running on port ${PORT}`));