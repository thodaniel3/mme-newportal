// javas/admin.js (updated)
// Handles admin sign-in, auth state, slider, logout redirect, and prototype chat storage.

// Firebase imports (unchanged if you use Firebase)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ---------------- Your Firebase config (same as before) ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA65JiwWZEqt1zIXzE7S922BUE8oxMhecY",
  authDomain: "mme-students.firebaseapp.com",
  projectId: "mme-students",
  storageBucket: "mme-students.firebasestorage.app",
  messagingSenderId: "952878033602",
  appId: "1:952878033602:web:9340d5874fdc07abd4a95b",
  measurementId: "G-HQEFKGQWN0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Admin credentials you asked for (local fallback) ---------- */
const ADMIN_EMAIL = "adminmmeportal@futminna.edu.ng";
const ADMIN_PASSWORD = "adminmmeportal@123";

/* ---------- DOM elements ---------- */
const adminLink = document.getElementById("adminLink");
const openAdminSignIn = document.getElementById("openAdminSignIn");
const adminSigninModal = document.getElementById("adminSigninModal");
const adminSignInForm = document.getElementById("adminSignInForm");
const adminModalClose = document.getElementById("adminModalClose");
const adminError = document.getElementById("adminError");
const logoutBtn = document.getElementById("logout");
const sidebarLogout = document.getElementById("sidebarLogout");

/* show sign-in modal */
if (openAdminSignIn) {
  openAdminSignIn.addEventListener("click", () => {
    if (adminSigninModal) adminSigninModal.classList.remove("hidden");
  });
}

/* close modal */
if (adminModalClose) {
  adminModalClose.addEventListener("click", () => {
    adminSigninModal.classList.add("hidden");
    adminError.textContent = "";
    adminSignInForm.reset();
  });
}

/* Admin sign in form: try firebase, fallback to local credentials */
if (adminSignInForm) {
  adminSignInForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    adminError.textContent = "";

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    // try Firebase sign in first
    try {
      await signInWithEmailAndPassword(auth, email, password);
      adminSigninModal.classList.add("hidden");
      adminSignInForm.reset();
      return;
    } catch (err) {
      console.warn("Firebase sign-in failed (will try local fallback):", err);
      // continue to fallback
    }

    // Local fallback check
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      // mark admin as signed-in locally
      localStorage.setItem("mme_admin_signed_in", "1");
      adminSigninModal.classList.add("hidden");
      adminSignInForm.reset();
      updateUIForAuthState(true);
      return;
    }

    adminError.textContent = "Failed to sign in. Check credentials.";
  });
}

/* Logout logic: signs out firebase if used, clears local fallback and redirects to index.html */
async function doLogout() {
  try {
    // try firebase sign out if user is firebase-authenticated
    try { await signOut(auth); } catch(e){ /* ignore */ }
    // clear local fallback flag
    localStorage.removeItem("mme_admin_signed_in");
    // redirect to login page
    window.location.href = "index.html";
  } catch (err) {
    console.error("Sign out error:", err);
    // still redirect
    localStorage.removeItem("mme_admin_signed_in");
    window.location.href = "index.html";
  }
}

if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
if (sidebarLogout) sidebarLogout.addEventListener("click", (e) => { e.preventDefault(); doLogout(); });

/* Respond to Firebase auth changes */
onAuthStateChanged(auth, (user) => {
  const isAdminFirebase = user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isLocalAdmin = localStorage.getItem("mme_admin_signed_in") === "1";
  const isAdmin = isAdminFirebase || isLocalAdmin;

  if (adminLink) adminLink.classList.toggle("hidden", !isAdmin);
  if (logoutBtn) logoutBtn.classList.toggle("hidden", !user && !isLocalAdmin);

  // Prevent non-admins from viewing admin.html
  if (!isAdmin && window.location.pathname.endsWith("admin.html")) {
    alert("You must be signed in as admin to access this page.");
    window.location.href = "dashboard.html";
  }

  // If admin and on admin.html, load table
  if (isAdmin && window.location.pathname.endsWith("admin.html")) {
    loadStudentsTable();
  }
});

/* ------------------ Admin page data/export ------------------ */
async function exportStudentsCSV() {
  try {
    const snapshot = await getDocs(collection(db, "mme_students"));
    let csv = "Full Name,Matric,DOB,Gender,Phone,Level,State,Hobbies,Reality,Comments,Image URL,SubmittedAt\n";

    snapshot.forEach(doc => {
      const d = doc.data() || {};
      const submittedAt = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt) : "";
      function esc(s) { return `"${(s || "").toString().replace(/"/g, '""')}"`; }
      csv += [
        esc(d.fullName),
        esc(d.matric),
        esc(d.dob),
        esc(d.gender),
        esc(d.phone),
        esc(d.level),
        esc(d.state),
        esc(d.hobbies),
        esc(d.reality),
        esc(d.comments),
        esc(d.imageUrl || ""),
        esc(submittedAt)
      ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mme_students_export.csv";
    link.click();
  } catch (err) {
    console.error("Export error:", err);
    alert("Failed to export students. Check console for details.");
  }
}

const downloadButton = document.getElementById("downloadExcel");
if (downloadButton) downloadButton.addEventListener("click", exportStudentsCSV);

const exportConsoleBtn = document.getElementById("exportStudents");
if (exportConsoleBtn) {
  exportConsoleBtn.addEventListener("click", async () => {
    try {
      const snapshot = await getDocs(collection(db, "mme_students"));
      const arr = [];
      snapshot.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      console.log("MME Students:", arr);
      alert("Student data logged to console.");
    } catch (err) {
      console.error(err);
      alert("Failed to export to console.");
    }
  });
}

/* If on admin.html, fetch and populate student table */
async function loadStudentsTable() {
  if (!window.location.pathname.endsWith("admin.html")) return;

  const tbody = document.querySelector("#studentsTable tbody");
  if (!tbody) return;

  try {
    const snapshot = await getDocs(collection(db, "mme_students"));
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="12" class="muted">No student submissions yet.</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const d = doc.data() || {};
      const submittedAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.fullName || ""}</td>
        <td>${d.matric || ""}</td>
        <td>${d.dob || ""}</td>
        <td>${d.gender || ""}</td>
        <td>${d.phone || ""}</td>
        <td>${d.level || ""}</td>
        <td>${d.state || ""}</td>
        <td>${d.hobbies || ""}</td>
        <td title="${(d.reality || "").replace(/"/g,'') }">${(d.reality || "").substring(0,80)}</td>
        <td>${(d.comments || "").substring(0,60)}</td>
        <td>${d.imageUrl ? `<a href="${d.imageUrl}" target="_blank">View</a>` : "No Image"}</td>
        <td>${submittedAt}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error fetching students:", err);
    tbody.innerHTML = `<tr><td colspan="12" class="muted">Failed to load students. Check console.</td></tr>`;
  }
}

/* ------------------ Image slider (10s per slide) ------------------ */
(function sliderInit(){
  const slides = Array.from(document.querySelectorAll(".image-slider .slide"));
  if (!slides.length) return;
  let idx = slides.findIndex(s => s.classList.contains("active"));
  if (idx < 0) idx = 0;
  const total = slides.length;
  const NEXT_DELAY = 10000; // 10 seconds

  const setActive = (i) => {
    slides.forEach((s, j) => s.classList.toggle("active", j === i));
  };

  let timer = setInterval(() => {
    idx = (idx + 1) % total;
    setActive(idx);
  }, NEXT_DELAY);

  // controls
  const prevBtn = document.getElementById("prevSlide");
  const nextBtn = document.getElementById("nextSlide");
  if (prevBtn) prevBtn.addEventListener("click", () => { idx = (idx - 1 + total) % total; setActive(idx); resetTimer(); });
  if (nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % total; setActive(idx); resetTimer(); });

  function resetTimer(){
    clearInterval(timer);
    timer = setInterval(() => { idx = (idx + 1) % total; setActive(idx); }, NEXT_DELAY);
  }
})();

/* ------------------ Simple chat prototype (local storage) ------------------ */
/*
  This is a lightweight chat for demo:
  - Messages array stored in localStorage under key 'mme_chat_messages'
  - Each message: {id, from, to, body, timestamp}
  - chat.html provides UI to send and read messages
*/
function saveChatMessage(msg){
  const msgs = JSON.parse(localStorage.getItem("mme_chat_messages") || "[]");
  msgs.push(msg);
  localStorage.setItem("mme_chat_messages", JSON.stringify(msgs));
}
function getChatMessages(){
  return JSON.parse(localStorage.getItem("mme_chat_messages") || "[]");
}

// Expose chat helpers globally for chat.html to use
window.MME_CHAT = { saveChatMessage, getChatMessages };

/* End of admin.js */
