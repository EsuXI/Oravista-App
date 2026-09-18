const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// ---------------------------------------------------------
// THIS IS SERVER.JS FOR MOBILE & API
// ---------------------------------------------------------

// ---------------------------------------------------------
// SUPABASE
// ---------------------------------------------------------

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------
// EXPRESS
// ---------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

const isVercel = process.env.VERCEL === "1";
const uploadDir = isVercel ? "/tmp/uploads" : path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadDir));

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------------------------------------------------------
// EMAIL TRANSPORTER
// ---------------------------------------------------------

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ---------------------------------------------------------
// MULTER
// ---------------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, "profile_" + Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

const recordStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, "record_" + Date.now() + path.extname(file.originalname)),
});

const uploadRecord = multer({ storage: recordStorage });

// ---------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error || !users || users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OraVista - Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
          <h2 style="color: #111827;">King Epres Dental Clinic</h2>
          <p>Hello ${user.first_name},</p>
          <p>This is your login verification code. Enter it to gain access.</p>
          <h1 style="background: #1F2937; color: #FFFFFF; padding: 15px 25px; display: inline-block; letter-spacing: 8px; border-radius: 6px;">
            ${otp}
          </h1>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "OTP sent successfully!",
      generatedOtp: otp,
      user: user,
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ---------------------------------------------------------
// VERIFY OTP
// ---------------------------------------------------------

app.post("/api/verify-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error || !users || users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = users[0];

    return res.status(200).json({
      message: "Verified",
      token: "logged_in_token",
      user,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ---------------------------------------------------------
// FORGOT PASSWORD
// ---------------------------------------------------------

app.post("/api/forgot-password", async (req, res) => {
  const { email, action } = req.body;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error || !users || users.length === 0) {
      return res.status(404).json({ message: "Email not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let emailSubject = "OraVista - Verification Code";
    let emailBody = "Please use the verification code below to proceed.";

    if (action === "change") {
      emailSubject = "OraVista - Change Password Request";
      emailBody = "You requested to change your password from settings. Use this code to authorize the change.";
    } else {
      emailSubject = "OraVista - Forgot Password Request";
      emailBody = "Use this code to recover your account and set a new password.";
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
          <h1 style="background: #1F2937; color: #FFFFFF; padding: 15px 25px; display: inline-block; letter-spacing: 8px;">
            ${otp}
          </h1>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "OTP sent successfully!",
      generatedOtp: otp,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ---------------------------------------------------------
// VERIFY CURRENT PASSWORD
// ---------------------------------------------------------

app.post("/api/verify-current-password", async (req, res) => {
  const { id, password } = req.body;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("password")
      .eq("id", id);

    if (error || !users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);

    if (isMatch) {
      return res.status(200).json({ message: "Valid" });
    }

    return res.status(401).json({ message: "Incorrect current password." });
  } catch (err) {
    console.error("Verify Current Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------------------------------------
// UPDATE PASSWORD
// ---------------------------------------------------------

app.put("/api/update-password", async (req, res) => {
  const { id, newPassword } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Update Password Error:", err);
    return res.status(500).json({ message: "Database update failed." });
  }
});

// ---------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------

app.put("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (error) throw error;

    return res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ---------------------------------------------------------
// REGISTRATION
// ---------------------------------------------------------

app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  try {
    const { data: existingUsers } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          password: hashedPassword,
          role: "patient",
          branch: "Main Branch",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Ensure corresponding patient record exists for web profile compatibility
    if (newUser && newUser.id) {
      await supabase.from("patient").insert([
        {
          user_id: newUser.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        },
      ]);
    }

    return res.status(201).json({ message: "Registration successful!" });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({ message: "Server error during registration." });
  }
});

// ---------------------------------------------------------
// PROFILE PICTURE UPLOAD
// ---------------------------------------------------------

const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

app.post(
  "/api/upload-profile-picture",
  memoryUpload.single("profileImage"),
  async (req, res) => {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = `profile_${userId}_${Date.now()}.jpg`;

    try {
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // Update users table
      await supabase
        .from("users")
        .update({ profile_picture: publicUrl, profile_pic: publicUrl })
        .eq("id", userId);

      // Also update patient table for web sync
      await supabase
        .from("patient")
        .update({ profile_image: publicUrl })
        .eq("user_id", userId);

      return res.status(200).json({
        message: "Uploaded successfully!",
        filePath: publicUrl,
        imageUrl: publicUrl,
      });
    } catch (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ message: "Database update failed." });
    }
  }
);

// ---------------------------------------------------------
// UPDATE PROFILE (FIXED: SYNC BOTH USERS & PATIENT TABLES)
// ---------------------------------------------------------

app.put("/api/update-profile", async (req, res) => {
  const {
    id,
    firstName,
    lastName,
    first_name,
    last_name,
    email,
    sex,
    dob,
    age,
    phone,
    occupation,
    blood_type,
    allergies,
    insurance,
    policy_number,
    profilePic,
    profile_image,
  } = req.body;

  const resolvedFirstName = firstName || first_name;
  const resolvedLastName = lastName || last_name;
  const resolvedPic = profilePic || profile_image;

  try {
    // 1. Update users table
    const { error: userError } = await supabase
      .from("users")
      .update({
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        email: email,
        sex: sex,
        dob: dob,
        age: age,
        phone: phone,
        occupation: occupation,
        blood_type: blood_type,
        allergies: allergies,
        insurance: insurance,
        policy_number: policy_number,
        profile_picture: resolvedPic,
        profile_pic: resolvedPic,
      })
      .eq("id", id);

    if (userError) throw userError;

    // 2. Update patient table so Web Profile stays 100% in sync
    const { data: existingPatient } = await supabase
      .from("patient")
      .select("id")
      .eq("user_id", id)
      .maybeSingle();

    if (existingPatient) {
      await supabase
        .from("patient")
        .update({
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          age: age,
          phone: phone,
          occupation: occupation,
          dob: dob,
          profile_image: resolvedPic,
        })
        .eq("user_id", id);
    } else {
      await supabase.from("patient").insert([
        {
          user_id: id,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          age: age,
          phone: phone,
          occupation: occupation,
          dob: dob,
          profile_image: resolvedPic,
        },
      ]);
    }

    return res.status(200).json({ message: "Profile updated successfully!" });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ message: "Failed update." });
  }
});

// ---------------------------------------------------------
// USER BILLINGS
// ---------------------------------------------------------

app.get("/api/user-billings/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: records, error } = await supabase
      .from("appointments")
      .select("id, service_type, amount, base_price, billing_status, appointment_date, receipt_details")
      .eq("user_id", userId)
      .order("appointment_date", { ascending: false });

    if (error) throw error;

    const totalOutstanding = (records || [])
      .filter((r) => r.billing_status === "Pending")
      .reduce((sum, r) => sum + Number(r.amount || r.base_price || 0), 0);

    const formattedRecords = (records || []).map((record) => {
      const d = new Date(record.appointment_date);
      const formattedDate = d.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });

      return {
        id: record.id,
        title: record.service_type,
        amount: record.amount || record.base_price || 0,
        status: record.billing_status || "Pending",
        date: formattedDate,
        invoice_path: record.receipt_details,
      };
    });

    return res.status(200).json({
      records: formattedRecords,
      totalOutstanding,
    });
  } catch (err) {
    console.error("User Billings Error:", err);
    return res.status(500).json({ message: "Error fetching bills" });
  }
});

// ---------------------------------------------------------
// GET BOOKED TIMES (SUPPORTS ARRAY & OBJECT RESPONSES)
// ---------------------------------------------------------

app.get("/api/booked-times", async (req, res) => {
  const { date, dentist } = req.query;

  if (!date || !dentist) {
    return res.status(400).json({ message: "Date and dentist are required." });
  }

  try {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("appointment_time, service_type")
      .eq("appointment_date", date)
      .eq("dentist_name", dentist)
      .neq("status", "Cancelled");

    if (error) throw error;

    const bookedTimes = (appointments || []).map((appointment) => ({
      appointment_time: appointment.appointment_time,
      time: appointment.appointment_time,
      service_type: appointment.service_type,
      service: appointment.service_type,
    }));

    // Return object with array fallback for 100% web & mobile client compatibility
    return res.status(200).json({
      bookedTimes: bookedTimes,
    });
  } catch (err) {
    console.error("BOOKED TIMES SERVER ERROR:", err);
    return res.status(500).json({ message: "Error fetching booked times" });
  }
});

// ---------------------------------------------------------
// BOOK APPOINTMENT (FIXED: INSERTS BASE PRICE & HANDLES ALIASES)
// ---------------------------------------------------------

app.post("/api/book-appointment", async (req, res) => {
  const {
    user_id,
    userId,
    service_type,
    service,
    dentist_name,
    dentist,
    appointment_date,
    date,
    appointment_time,
    time,
    branch,
    basePrice,
    base_price,
    price,
    service_price,
  } = req.body;

  const resolvedUserId = user_id || userId;
  const resolvedService = service_type || service;
  const resolvedDentist = dentist_name || dentist;
  const resolvedDate = appointment_date || date;
  const resolvedTime = appointment_time || time;
  const resolvedPrice = basePrice || base_price || price || service_price || 0;

  if (
    !resolvedUserId ||
    !resolvedService ||
    !resolvedDentist ||
    !resolvedDate ||
    !resolvedTime ||
    !branch
  ) {
    return res.status(400).json({
      message: "Missing required booking information.",
    });
  }

  try {
    // 1. Check existing appointment collision
    const { data: existingAppointments, error: existingError } = await supabase
      .from("appointments")
      .select("id, booking_ref, service_type, status")
      .eq("appointment_date", resolvedDate)
      .eq("appointment_time", resolvedTime)
      .eq("dentist_name", resolvedDentist)
      .neq("status", "Cancelled");

    if (existingError) throw existingError;

    if (existingAppointments && existingAppointments.length > 0) {
      return res.status(409).json({
        message: "This appointment time is already booked for the selected dentist.",
      });
    }

    const booking_ref = `OV - ${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 2. Insert with base price and amount included
    const { error: insertError } = await supabase.from("appointments").insert([
      {
        user_id: resolvedUserId,
        booking_ref: booking_ref,
        service_type: resolvedService,
        dentist_name: resolvedDentist,
        appointment_date: resolvedDate,
        appointment_time: resolvedTime,
        branch: branch,
        branch_address: branch,
        base_price: Number(resolvedPrice),
        amount: Number(resolvedPrice),
        status: "Pending",
        billing_status: "Pending",
      },
    ]);

    if (insertError) throw insertError;

    return res.status(201).json({
      message: "Appointment booked successfully!",
      booking_ref: booking_ref,
    });
  } catch (err) {
    console.error("BOOKING SERVER ERROR:", err);
    return res.status(500).json({
      message: err?.message || "Server error while creating appointment.",
    });
  }
});

// ---------------------------------------------------------
// GET USER APPOINTMENTS
// ---------------------------------------------------------

app.get("/api/user-appointments/:userId", async (req, res) => {
  try {
    const { data: results, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("appointment_date", { ascending: false });

    if (error) throw error;

    return res.status(200).json(results || []);
  } catch (err) {
    console.error("User Appointments Error:", err);
    return res.status(500).json({ message: "Error" });
  }
});

// ---------------------------------------------------------
// UPDATE APPOINTMENT STATUS
// ---------------------------------------------------------

app.put("/api/update-appointment-status", async (req, res) => {
  const { appointment_id, status } = req.body;

  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment_id);

    if (error) throw error;

    return res.status(200).json({ message: "Appointment status updated!" });
  } catch (err) {
    console.error("Update Appointment Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ---------------------------------------------------------
// PATIENT RECORDS
// ---------------------------------------------------------

app.get("/api/patient-records/:userId", async (req, res) => {
  try {
    const { data: records, error } = await supabase
      .from("patient_records")
      .select("id, file_name, file_path, upload_date, clinic_branch, dentist_name")
      .eq("user_id", req.params.userId)
      .order("upload_date", { ascending: false });

    if (error) throw error;

    return res.status(200).json(records || []);
  } catch (err) {
    console.error("Patient Records Error:", err);
    return res.status(500).json({ message: "Error" });
  }
});

// ---------------------------------------------------------
// USER PROFILE
// ---------------------------------------------------------

app.get("/api/user-profile", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error || !users || users.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    const user = users[0];
    delete user.password;

    return res.status(200).json(user);
  } catch (err) {
    console.error("User Profile Error:", err);
    return res.status(500).json({ message: "Error" });
  }
});

// ---------------------------------------------------------
// SERVER
// ---------------------------------------------------------

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`OraVista Backend running on port ${PORT}`)
  );
}

module.exports = app;