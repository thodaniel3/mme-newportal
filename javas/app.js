// =======================================
// 5-SECOND VIDEO DELAY BEFORE FORM SHOWS
// =======================================
window.addEventListener("load", () => {
  const loginContainer = document.getElementById("loginContainer");

  if (loginContainer) {
    loginContainer.classList.add("hidden");

    // Show after 5 seconds (5000ms)
    setTimeout(() => {
      loginContainer.classList.remove("hidden");
      loginContainer.classList.add("show");
    }, 5000);
  }
});// javas/app.js
// single module loaded by all pages

// ====================== FIREBASE IMPORTS ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
  apiKey: "AIzaSyDb6yCz2FThZRJ_8k2qzs-r5wTPY49qB1E",
  authDomain: "mme-students-database.firebaseapp.com",
  projectId: "mme-students-database",
  storageBucket: "mme-students-database.appspot.com",
  messagingSenderId: "882949139978",
  appId: "1:882949139978:web:36026c7053ad6e46c039f3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper: get element safely
const $ = (id) => document.getElementById(id);

// ----------- COMMON FEATURES (remember me) -----------
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    const savedEmail = localStorage.getItem("savedEmail");
    const savedPassword = localStorage.getItem("savedPassword");
    if (savedEmail && savedPassword) {
      if ($("loginEmail")) $("loginEmail").value = savedEmail;
      if ($("loginPassword")) $("loginPassword").value = savedPassword;
      if ($("rememberMe")) $("rememberMe").checked = true;
    }
  });
}

// ====================== REGISTER ======================
const registerForm = $("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // save minimal profile to Firestore
      await setDoc(doc(db, "users", user.uid), { email: user.email, createdAt: Date.now() });
      alert("Registration successful!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message);
    }
  });
}

// ====================== LOGIN ======================
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const remember = $("rememberMe") ? $("rememberMe").checked : false;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (remember) {
        localStorage.setItem("savedEmail", email);
        localStorage.setItem("savedPassword", password);
      } else {
        localStorage.removeItem("savedEmail");
        localStorage.removeItem("savedPassword");
      }

      // go to dashboard
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message);
    }
  });
}

// ====================== FORGOT PASSWORD (from forgot-password.html) ======================
const forgotForm = $("forgotPasswordForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("resetEmail").value.trim();
    if (!email) {
      alert("Please enter your email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent! Check your email (and spam).");
      // optional: redirect to login after send
      // window.location.href = "index.html";
    } catch (err) {
      console.error("Reset error:", err);
      alert(err.message);
    }
  });
}

// ====================== FORGOT LINK (from login page) ======================
// On login page, the "Forgot Password?" anchor links to forgot-password.html so no extra code needed.

// ====================== DASHBOARD: AUTH CHECK & LOAD USERS ======================
const userDetails = $("userDetails"); // optional element on dashboard
onAuthStateChanged(auth, async (user) => {
  const onDashboard = window.location.pathname.endsWith("dashboard.html") || window.location.pathname === "/dashboard.html";
  if (user) {
    // if on dashboard, load users
    if (onDashboard) {
      // populate user details (if element exists)
      if (userDetails) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            userDetails.innerHTML = `<p><b>Email:</b> ${docSnap.data().email}</p>`;
          } else {
            userDetails.innerHTML = `<p><b>Email:</b> ${user.email}</p>`;
          }
        } catch (err) {
          console.error("Error fetching user doc:", err);
        }
      }

      // load students into list (collection "students" expected)
      const studentsListEl = $("studentsList");
      if (studentsListEl) {
        try {
          const studentsCol = collection(db, "students");
          const snapshot = await getDocs(studentsCol);
          studentsListEl.innerHTML = "";
          if (snapshot.empty) {
            studentsListEl.innerHTML = `<li class="muted">No students found.</li>`;
          } else {
            snapshot.forEach(docItem => {
              const data = docItem.data();
              const li = document.createElement("li");
              li.textContent = `${data.name || data.email || "Unnamed"} — ${data.matric || ""}`;
              li.addEventListener("click", () => {
                const profileContent = $("profileContent");
                if (profileContent) {
                  profileContent.innerHTML = `<p><strong>${data.name || "No name"}</strong><br>Email: ${data.email || ""}<br>Matric: ${data.matric || ""}</p>`;
                }
              });
              studentsListEl.appendChild(li);
            });
          }
        } catch (err) {
          console.error("Error loading students:", err);
          studentsListEl.innerHTML = `<li class="muted">Failed to load students.</li>`;
        }
      }
    }
  } else {
    // not logged in
    if (onDashboard) {
      window.location.href = "index.html";
    }
  }
});

// ====================== LOGOUT ======================
// LOGOUT BUTTON FUNCTION
document.getElementById('logout').addEventListener('click', async () => {
  try {
    // Supabase logout
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Try again.');
      return;
    }

    // Redirect to index.html after successful logout
    window.location.href = "index.html";

  } catch (err) {
    console.error('Unexpected logout error:', err);
    alert('Unexpected error. Try again.');
  }
});

// ====================== ADD STUDENT (simple example) ======================
const addStudentForm = $("addStudentForm");
if (addStudentForm) {
  addStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("stuName").value.trim();
    const email = $("stuEmail").value.trim();
    const matric = $("stuMat").value.trim();
    const level = $("stuLevel").value;
    try {
      await addDoc(collection(db, "students"), { name, email, matric, level, createdAt: Date.now() });
      alert("Student added (refresh dashboard to see).");
      // optionally refresh list or reload page
    } catch (err) {
      console.error("Add student error:", err);
      alert(err.message);
    }
  });
}
