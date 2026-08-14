const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); 
const crypto = require('crypto'); 
const multer = require('multer'); 
const path = require('path');     
const fs = require('fs');         
require('dotenv').config();

// Initialize Supabase Client
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'profile_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const recordStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'record_' + Date.now() + path.extname(file.originalname))
});
const uploadRecord = multer({ storage: recordStorage });

// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        
        if (error || users.length === 0) return res.status(401).json({ message: "Invalid email or password." });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 5 * 60000).toISOString();

        await supabase.from('users').update({ current_otp: otp, otp_expiry: expiryDate }).eq('id', user.id);

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
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        
        if (error || users.length === 0) return res.status(404).json({ message: "User not found." });
        const user = users[0];
        
        if (user.current_otp !== otp) return res.status(401).json({ message: "Invalid verification code." });
        
        // FIX: Force Node.js to treat the database timestamp as UTC by appending 'Z'
        const expiryString = user.otp_expiry.endsWith('Z') ? user.otp_expiry : user.otp_expiry + 'Z';
        if (new Date() > new Date(expiryString)) return res.status(401).json({ message: "Code has expired." });

        await supabase.from('users').update({ current_otp: null, otp_expiry: null }).eq('id', user.id);
        res.status(200).json({ message: "Verified", token: "logged_in_token", user });
    } catch (err) { res.status(500).json({ message: "Server error." }); }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email, action } = req.body; 
    try {
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        if (error || users.length === 0) return res.status(404).json({ message: "Email not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryDate = new Date(Date.now() + 10 * 60000).toISOString();
        
        await supabase.from('users').update({ current_otp: otp, otp_expiry: expiryDate }).eq('id', users[0].id);

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
        const { data: users, error } = await supabase.from('users').select('password').eq('id', id);
        if (error || users.length === 0) return res.status(404).json({ message: "User not found" });
        
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
        
        const { error } = await supabase.from('users').update({ password: hashedPassword }).eq('id', id);
        if (error) throw error;
        
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (err) { res.status(500).json({ message: "Database update failed." }); }
});

app.put('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        const { error } = await supabase.from('users').update({ password: hashedPassword }).eq('email', email);
        if (error) throw error;
        
        res.status(200).json({ message: "Password reset successful!" });
    } catch (err) { res.status(500).json({ message: "Server error." }); }
});

// ---------------------------------------------------------
// REGISTRATION ROUTE
// ---------------------------------------------------------
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body; 

    try {
        const { data: existingUsers } = await supabase.from('users').select('*').eq('email', email);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { error } = await supabase.from('users').insert([
            { first_name: firstName, last_name: lastName, email, phone, password: hashedPassword }
        ]);
        if (error) throw error;

        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Server error during registration." });
    }
});
// ---------------------------------------------------------
// PROFILE PICTURE UPLOAD ROUTE
// ---------------------------------------------------------
app.post('/api/upload-profile-picture', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = `uploads/${req.file.filename}`;

    try {

        const { error } = await supabase
            .from('users')
            .update({ profile_picture: filePath })
            .eq('id', userId);
            
        if (error) throw error;
        
        res.status(200).json({ message: "Profile picture uploaded successfully!", filePath });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ message: "Database update failed." });
    }
});

app.put('/api/update-profile', async (req, res) => {
    const { id, firstName, lastName, email, sex, dob, age, phone, occupation, address, blood_type, allergies, insurance, policy_number } = req.body;
    try {
        const { error } = await supabase.from('users').update({
            first_name: firstName, 
            last_name: lastName, 
            email, 
            sex, 
            dob, 
            age, 
            phone, 
            occupation, 
            address,
            blood_type,
            allergies, 
            insurance, 
            policy_number
        }).eq('id', id);
        
        if (error) throw error;
        res.status(200).json({ message: "Profile updated!" });
    } catch (err) { 
        res.status(500).json({ message: "Failed update." }); 
    }
});

app.get('/api/user-billings/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const { data: records, error } = await supabase
            .from('billings')
            .select('id, title, amount, status, date, invoice_path')
            .eq('user_id', userId)
            .order('date', { ascending: false });
            
        if (error) throw error;

        // Calculate total outstanding balance
        const totalOutstanding = records
            .filter(r => r.status === 'Pending')
            .reduce((sum, r) => sum + Number(r.amount), 0);

        // Format dates to match original MySQL DATE_FORMAT("%M %d, %Y")
        const formattedRecords = records.map(record => {
            const d = new Date(record.date);
            const formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
            return { ...record, date: formattedDate };
        });

        res.status(200).json({ records: formattedRecords, totalOutstanding });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/booked-times', async (req, res) => {
    const { date, dentist } = req.query;
    try {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('appointment_time, service_type')
            .eq('appointment_date', date)
            .eq('dentist_name', dentist)
            .neq('status', 'Cancelled');
            
        if (error) throw error;

        // Format the data exactly how your frontend overlap calculator expects it
        const bookedTimes = appointments.map(app => ({
            time: app.appointment_time,
            service_type: app.service_type
        }));
        
        res.status(200).json(bookedTimes);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: "Error fetching booked times" }); 
    }
});

app.post('/api/book-appointment', async (req, res) => {
    // FIX: Added branch_address to the incoming request
    const { user_id, service_type, dentist_name, appointment_date, appointment_time, branch_address } = req.body;
    try {
        const booking_ref = `OV - ${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        const { error } = await supabase.from('appointments').insert([
            { 
                user_id, 
                booking_ref, 
                service_type, 
                dentist_name, 
                appointment_date, 
                appointment_time, 
                branch_address,
                status: 'Pending' 
            }
        ]);
        if (error) throw error;
        
        res.status(201).json({ message: "Booked!", booking_ref });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/user-appointments/:userId', async (req, res) => {
    try {
        const { data: results, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', req.params.userId)
            .order('appointment_date', { ascending: false });
            
        if (error) throw error;
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/update-appointment-status', async (req, res) => {
    const { appointment_id, status } = req.body;
    try {
        const { error } = await supabase.from('appointments').update({ status }).eq('id', appointment_id);
        if (error) throw error;
        
        res.status(200).json({ message: "Appointment status updated!" });
    } catch (err) {
        console.error("Update Appointment Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

app.get('/api/patient-records/:userId', async (req, res) => {
    try {
        const { data: records, error } = await supabase
            .from('patient_records')
            .select('id, file_name, file_path, upload_date')
            .eq('user_id', req.params.userId)
            .order('upload_date', { ascending: false });
            
        if (error) throw error;
        res.status(200).json(records);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/user-profile', async (req, res) => {
    const { email } = req.query;
    try {
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        
        if (error || users.length === 0) return res.status(404).json({ message: "Not found" });
        
        const user = users[0]; 
        delete user.password; 
        res.status(200).json(user);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

const PORT = process.env.PORT || 5000;

// Only listen on a port if we are NOT on Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => console.log(`OraVista Backend running on port ${PORT}`));
}

// VERCEL FIX: Export the app so Vercel can run it
module.exports = app;