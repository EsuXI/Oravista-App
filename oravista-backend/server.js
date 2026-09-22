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
// SUPABASE
// ---------------------------------------------------------
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
// NOTIFICATION ROUTES (RESOLVES 404)
// ---------------------------------------------------------

// 1. Fetch User Notifications
app.get("/api/notifications/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.status(200).json(notifications || []);
  } catch (err) {
    console.error("Notification fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// 2. Mark Notification Read
app.put("/api/notifications/:notificationId/read", async (req, res) => {
  const { user_id } = req.body || {};
  const { notificationId } = req.params;
  if (!user_id) return res.status(400).json({ message: "User ID is required." });

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user_id);

    if (error) throw error;
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (err) {
    console.error("Notification read error:", err);
    return res.status(500).json({ message: "Failed to update notification." });
  }
});

// ---------------------------------------------------------
// SEND OTP (HANDLES LOGIN, FORGOT_PASSWORD, CHANGE_PASSWORD)
// ---------------------------------------------------------
app.post("/api/send-otp", async (req, res) => {
  const { email, action } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", cleanEmail);

    if (error || !users || users.length === 0) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    const user = users[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let emailSubject = "OraVista - Verification Code";
    let emailBody = "Please use the verification code below to proceed.";

    if (action === "change_password" || action === "change") {
      emailSubject = "OraVista - Change Password Request";
      emailBody = "You requested to change your password. Enter this code to verify your identity.";
    } else if (action === "forgot_password") {
      emailSubject = "OraVista - Password Reset Code";
      emailBody = "Use this verification code to reset your account password.";
    } else {
      emailSubject = "OraVista - Login Verification Code";
      emailBody = "This is your login verification code. Enter it to gain access.";
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: cleanEmail,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
          <h2 style="color: #001166;">King Epres Dental Clinic</h2>
          <p>Hello ${user.first_name || "Patient"},</p>
          <p>${emailBody}</p>
          <h1 style="background: #001166; color: #FFFFFF; padding: 15px 25px; display: inline-block; letter-spacing: 8px; border-radius: 8px;">
            ${otp}
          </h1>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "OTP sent successfully!",
      generatedOtp: otp,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ message: "Failed to send verification email." });
  }
});

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
// UPDATE PROFILE
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
// BOOK APPOINTMENT
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
    return res.status(400).json({ message: "Missing required booking information." });
  }

  try {
    const booking_ref = `OV - ${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

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
    return res.status(500).json({ message: "Server error while creating appointment." });
  }
});

// ---------------------------------------------------------
// APPOINTMENTS & STATUS UPDATES (TRIGGERS NOTIFICATIONS & EMAILS)
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

app.put("/api/update-appointment-status", async (req, res) => {
  const { appointment_id, status } = req.body;

  try {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment_id);

    if (updateError) throw updateError;

    if (status === "Confirmed") {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, user_id, service_type, dentist_name, appointment_date, appointment_time, amount, base_price, branch")
        .eq("id", appointment_id);

      if (appts && appts.length > 0) {
        const appt = appts[0];
        const { data: users } = await supabase
          .from("users")
          .select("first_name, email")
          .eq("id", appt.user_id);

        const user = users?.[0];
        const cost = Number(appt.amount || appt.base_price || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        const title = "Appointment Confirmed";
        const message = `Your ${appt.service_type} appointment with ${appt.dentist_name} on ${appt.appointment_date} at ${appt.appointment_time} has been confirmed. Base price: ₱${cost}.`;

        await supabase.from("notifications").insert([
          {
            user_id: appt.user_id,
            appointment_id: appt.id,
            notification_type: "appointment_confirmed",
            title: title,
            message: message,
            is_read: false,
          },
        ]);

        if (user?.email) {
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject: "OraVista - Appointment Confirmed",
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #001166;">
                  <h2>King Epres Dental Clinic</h2>
                  <p>Hello ${user.first_name},</p>
                  <p>Your appointment has been confirmed!</p>
                  <p><strong>Service:</strong> ${appt.service_type}</p>
                  <p><strong>Base Price:</strong> ₱${cost}</p>
                  <p><strong>Dentist:</strong> ${appt.dentist_name}</p>
                  <p><strong>Date:</strong> ${appt.appointment_date}</p>
                  <p><strong>Time:</strong> ${appt.appointment_time}</p>
                  <p><strong>Branch:</strong> ${appt.branch || "Main Branch"}</p>
                  <p>Status: <strong>Confirmed</strong></p>
                </div>
              `,
            });
          } catch (mailErr) {
            console.error("Confirmation mail error:", mailErr);
          }
        }
      }
    }

    return res.status(200).json({ message: `Appointment marked as ${status}!` });
  } catch (err) {
    console.error("Update Appointment Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// Late / No Show route
app.put("/api/appointments/:appointmentId/late-no-show", async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id, user_id, status, service_type, dentist_name, appointment_date, appointment_time")
      .eq("id", appointmentId);

    if (error || !appts || appts.length === 0) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    const appt = appts[0];

    await supabase
      .from("appointments")
      .update({ status: "Late / No Show" })
      .eq("id", appointmentId);

    const { data: users } = await supabase
      .from("users")
      .select("first_name, email")
      .eq("id", appt.user_id);

    const user = users?.[0];
    const title = "Appointment marked Late / No Show";
    const message = `Your ${appt.service_type} appointment on ${appt.appointment_date} at ${appt.appointment_time} was marked Late / No Show. You may cancel it or request to reschedule.`;

    await supabase.from("notifications").insert([
      {
        user_id: appt.user_id,
        appointment_id: appt.id,
        notification_type: "appointment_late_no_show",
        title: title,
        message: message,
        is_read: false,
      },
    ]);

    if (user?.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "OraVista - Action needed for your appointment",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #001166;">
              <h2>King Epres Dental Clinic</h2>
              <p>Hello ${user.first_name},</p>
              <p>Your <strong>${appt.service_type}</strong> appointment on <strong>${appt.appointment_date} at ${appt.appointment_time}</strong> was marked Late / No Show.</p>
              <p>Please open the OraVista app to cancel the appointment or request a new schedule.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("Late/No-Show mail error:", mailErr);
      }
    }

    return res.status(200).json({ message: "Appointment marked Late / No Show." });
  } catch (err) {
    console.error("Late/No-Show error:", err);
    return res.status(500).json({ message: "Failed to mark late/no-show." });
  }
});

// Cancel appointment
app.put("/api/appointments/:appointmentId/cancel", async (req, res) => {
  const { user_id } = req.body || {};
  const { appointmentId } = req.params;

  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Cancelled" })
      .eq("id", appointmentId)
      .eq("user_id", user_id);

    if (error) throw error;
    return res.status(200).json({ message: "Appointment cancelled." });
  } catch (err) {
    console.error("Cancellation error:", err);
    return res.status(500).json({ message: "Failed to cancel appointment." });
  }
});

// User Profile
app.get("/api/user-profile", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error || !users || users.length === 0) return res.status(404).json({ message: "Not found" });

    const user = users[0];
    delete user.password;
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: "Error" });
  }
});

// Billings
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
      return {
        id: record.id,
        title: record.service_type,
        amount: record.amount || record.base_price || 0,
        status: record.billing_status || "Pending",
        date: d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }),
        invoice_path: record.receipt_details,
      };
    });

    return res.status(200).json({ records: formattedRecords, totalOutstanding });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching bills" });
  }
});

// Patient Records
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
    return res.status(500).json({ message: "Error" });
  }
});

const PORT = process.env.PORT || 5000;
if (!isVercel) {
  app.listen(PORT, "0.0.0.0", () => console.log(`OraVista Backend running on port ${PORT}`));
}

module.exports = app;