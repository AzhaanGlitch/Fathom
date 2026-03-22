// frontend/src/components/ui/animated-characters-login-page.jsx
// FIXES:
//  1. Name / facultyName fields are ONLY shown during sign-up, never during login
//  2. On login, we LOOK UP the existing mentor by owner_uid — we never create a new one
//  3. Admin "All Sessions" link wired in DashboardLayout (separate file)

import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { Eye, EyeOff, ArrowLeft, Loader, CheckCircle, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { accessCodeApi, mentorApi } from "../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: on SIGN-UP → create mentor if not existing
// Helper: on LOGIN  → only look up, never create
// ─────────────────────────────────────────────────────────────────────────────
async function findExistingMentor(userUid) {
  try {
    const existing = await mentorApi.getByOwner(userUid);
    if (existing?.data?.id || existing?.data?._id) {
      return existing.data.id || existing.data._id;
    }
  } catch (_) { }
  return null;
}

async function ensureMentorExists({ name, email, userUid, role, institutionName }) {
  // First always try to find existing
  const existingId = await findExistingMentor(userUid);
  if (existingId) return existingId;

  // Only create on sign-up (caller must pass a real name)
  if (!name || !name.trim()) return null;

  const mentorName =
    role === "institution-faculty" ? institutionName || name : name;

  const res = await mentorApi.create({
    name: mentorName,
    email,
    expertise: [],
    bio: "",
    owner_uid: userUid,
    role,
    institution_name: role === "institution-faculty" ? institutionName : undefined,
  });
  return res.data.id || res.data._id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eye / Pupil components (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const pupil = pupilRef.current.getBoundingClientRect();
    const deltaX = mouseX - (pupil.left + pupil.width / 2);
    const deltaY = mouseY - (pupil.top + pupil.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();
  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`, height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
};

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const eye = eyeRef.current.getBoundingClientRect();
    const deltaX = mouseX - (eye.left + eye.width / 2);
    const deltaY = mouseY - (eye.top + eye.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();
  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: `${size}px`, height: isBlinking ? "2px" : `${size}px`, backgroundColor: eyeColor, overflow: "hidden" }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`, height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Institution Code Field with live validation
// ─────────────────────────────────────────────────────────────────────────────
const InstitutionCodeField = ({ value, onChange, validationState }) => {
  const borderClass =
    validationState === "valid"
      ? "border-green-500/60 focus:border-green-500"
      : validationState === "invalid"
        ? "border-red-500/60 focus:border-red-500"
        : "border-gray-300 focus:border-black";

  return (
    <div className="space-y-2">
      <Label htmlFor="institutionCode" className="text-sm font-medium text-gray-700">
        Institution Code
      </Label>
      <div className="relative">
        <Input
          id="institutionCode"
          type="text"
          placeholder="64-character access code"
          value={value}
          autoComplete="off"
          onChange={onChange}
          className={`h-12 pr-10 bg-white text-gray-900 ${borderClass} font-mono text-xs`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationState === "checking" && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
          {validationState === "valid" && <CheckCircle className="w-4 h-4 text-green-500" />}
          {validationState === "invalid" && <XCircle className="w-4 h-4 text-red-500" />}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Login Page
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "institution-faculty";

  const [activeRole, setActiveRole] = useState(initialRole);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");           // admin / institution-faculty signup name
  const [facultyName, setFacultyName] = useState(""); // solo faculty signup name
  const [institutionCode, setInstitutionCode] = useState("");
  const [institutionName, setInstitutionName] = useState(""); // admin sign-up
  const [adminCode, setAdminCode] = useState("");

  // Institution code validation
  const [codeValidation, setCodeValidation] = useState(null);
  const [codeValidationMsg, setCodeValidationMsg] = useState("");
  const [verifiedInstitution, setVerifiedInstitution] = useState(null);
  const validateTimerRef = useRef(null);

  // UI state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Character animation state
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const yellowRef = useRef(null);
  const orangeRef = useRef(null);

  useEffect(() => {
    const h = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => { setIsPurpleBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => { setIsBlackBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedule = () => {
        const t = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => { setIsPurplePeeking(false); }, 800);
        }, Math.random() * 3000 + 2000);
        return t;
      };
      const t = schedule();
      return () => clearTimeout(t);
    }
    setIsPurplePeeking(false);
  }, [password, showPassword, isPurplePeeking]);

  // ── Institution code debounce validation ──────────────────────────────────
  useEffect(() => {
    if (activeRole !== "institution-faculty") return;
    if (!institutionCode.trim()) {
      setCodeValidation(null); setCodeValidationMsg(""); setVerifiedInstitution(null);
      return;
    }
    if (institutionCode.trim().length < 64) {
      setCodeValidation(null); setCodeValidationMsg(""); setVerifiedInstitution(null);
      return;
    }
    if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    setCodeValidation("checking");
    validateTimerRef.current = setTimeout(async () => {
      try {
        const res = await accessCodeApi.verify({ code_hash: institutionCode.trim() });
        if (res.data.valid) {
          setCodeValidation("valid");
          setCodeValidationMsg(res.data.institution_name ? `✓ ${res.data.institution_name}` : "✓ Valid code");
          setVerifiedInstitution(res.data.institution_name);
        } else {
          setCodeValidation("invalid");
          setCodeValidationMsg(res.data.message || "Invalid or revoked code");
          setVerifiedInstitution(null);
        }
      } catch {
        setCodeValidation(null); setCodeValidationMsg(""); setVerifiedInstitution(null);
      }
    }, 600);
    return () => { if (validateTimerRef.current) clearTimeout(validateTimerRef.current); };
  }, [institutionCode, activeRole]);

  // ── Character helpers ─────────────────────────────────────────────────────
  const calculatePosition = (ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const deltaX = mouseX - (rect.left + rect.width / 2);
    const deltaY = mouseY - (rect.top + rect.height / 3);
    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Admin validation
      if (activeRole === "admin" && adminCode !== "ADMIN2024") {
        throw new Error("Invalid administration access code.");
      }

      // Institution faculty: validate code on sign-up or if code provided
      if (activeRole === "institution-faculty" && institutionCode.trim()) {
        if (codeValidation === "invalid") {
          throw new Error(codeValidationMsg || "Invalid institution access code.");
        }
        if (codeValidation !== "valid") {
          try {
            const res = await accessCodeApi.verify({ code_hash: institutionCode.trim() });
            if (!res.data.valid) throw new Error(res.data.message || "Invalid institution access code.");
            setVerifiedInstitution(res.data.institution_name);
          } catch (verifyErr) {
            if (!verifyErr?.response) { /* network error — allow through */ }
            else throw verifyErr;
          }
        }
      }

      // Solo faculty sign-up: name required
      if (activeRole === "solo-faculty" && isSignUp && !facultyName.trim()) {
        throw new Error("Please enter your faculty name.");
      }

      // Firebase auth
      let userCredential;
      if (isSignUp) {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = activeRole === "solo-faculty" ? facultyName.trim() : name.trim();
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const uid = userCredential.user.uid;

      // Bind institution code
      if (activeRole === "institution-faculty" && institutionCode.trim()) {
        try {
          await accessCodeApi.verify({ code_hash: institutionCode.trim(), user_uid: uid });
        } catch { /* best-effort */ }
      }

      // ── Mentor lookup / creation ──────────────────────────────────────────
      // LOGIN:  only look up — never create a duplicate with a different name
      // SIGNUP: create if not found
      let mentorId = null;
      if (activeRole !== "admin") {
        if (isSignUp) {
          const resolvedName =
            activeRole === "institution-faculty"
              ? (verifiedInstitution || name.trim() || email.split("@")[0])
              : (facultyName.trim() || email.split("@")[0]);

          try {
            mentorId = await ensureMentorExists({
              name: resolvedName,
              email: userCredential.user.email,
              userUid: uid,
              role: activeRole,
              institutionName: activeRole === "institution-faculty" ? verifiedInstitution : undefined,
            });
          } catch (mentorErr) {
            console.error("Failed to create/find mentor:", mentorErr);
          }
        } else {
          // Login: strictly look up, don't create
          try {
            mentorId = await findExistingMentor(uid);
          } catch (mentorErr) {
            console.error("Failed to find mentor:", mentorErr);
          }
        }
      }

      // Persist to localStorage
      localStorage.setItem("userRole", activeRole);
      localStorage.setItem("userId", uid);
      if (mentorId) localStorage.setItem("mentorId", mentorId);
      if (verifiedInstitution) localStorage.setItem("institutionName", verifiedInstitution);
      if (activeRole === "solo-faculty" && isSignUp && facultyName.trim()) {
        localStorage.setItem("facultyName", facultyName.trim());
      }
      // On login, restore facultyName from Firebase profile if available
      if (!isSignUp && activeRole === "solo-faculty") {
        const displayName = userCredential.user.displayName;
        if (displayName) localStorage.setItem("facultyName", displayName);
      }

      const defaultRoute = activeRole === "admin" ? "/dashboard/analytics" : "/dashboard";
      navigate(defaultRoute);
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (activeRole === "institution-faculty" && institutionCode.trim() && codeValidation === "invalid") {
        throw new Error(codeValidationMsg || "Invalid institution access code.");
      }
      if (activeRole === "solo-faculty" && isSignUp && !facultyName.trim()) {
        throw new Error("Please enter your faculty name before continuing.");
      }

      const userCredential = await signInWithPopup(auth, googleProvider);
      const uid = userCredential.user.uid;
      const isNewUser = userCredential._tokenResponse?.isNewUser || false;

      if (activeRole === "institution-faculty" && institutionCode.trim() && codeValidation === "valid") {
        try { await accessCodeApi.verify({ code_hash: institutionCode.trim(), user_uid: uid }); } catch { }
      }

      let mentorId = null;
      if (activeRole !== "admin") {
        if (isNewUser || isSignUp) {
          // New Google user: create mentor
          const resolvedName =
            activeRole === "institution-faculty"
              ? (verifiedInstitution || userCredential.user.displayName || email.split("@")[0])
              : (facultyName.trim() || userCredential.user.displayName || userCredential.user.email.split("@")[0]);

          try {
            mentorId = await ensureMentorExists({
              name: resolvedName,
              email: userCredential.user.email,
              userUid: uid,
              role: activeRole,
              institutionName: activeRole === "institution-faculty" ? verifiedInstitution : undefined,
            });
          } catch (mentorErr) {
            console.error("Failed to create/find mentor:", mentorErr);
          }
        } else {
          // Returning Google user: look up only
          try {
            mentorId = await findExistingMentor(uid);
            // If not found still try ensureCreate as fallback for existing Google accounts
            if (!mentorId) {
              const resolvedName = userCredential.user.displayName || userCredential.user.email.split("@")[0];
              mentorId = await ensureMentorExists({
                name: resolvedName,
                email: userCredential.user.email,
                userUid: uid,
                role: activeRole,
                institutionName: activeRole === "institution-faculty" ? verifiedInstitution : undefined,
              });
            }
          } catch (mentorErr) {
            console.error("Failed to find mentor:", mentorErr);
          }
        }
      }

      localStorage.setItem("userRole", activeRole);
      localStorage.setItem("userId", uid);
      if (mentorId) localStorage.setItem("mentorId", mentorId);
      if (verifiedInstitution) localStorage.setItem("institutionName", verifiedInstitution);
      if (activeRole === "solo-faculty" && facultyName.trim()) localStorage.setItem("facultyName", facultyName.trim());
      if (!facultyName.trim() && userCredential.user.displayName) {
        localStorage.setItem("facultyName", userCredential.user.displayName);
      }

      const defaultRoute = activeRole === "admin" ? "/dashboard/analytics" : "/dashboard";
      navigate(defaultRoute);
    } catch (err) {
      console.error("Google auth error:", err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setEmail(""); setPassword(""); setConfirmPassword(""); setName("");
    setFacultyName(""); setInstitutionCode(""); setInstitutionName(""); setAdminCode("");
    setCodeValidation(null); setCodeValidationMsg(""); setVerifiedInstitution(null);
  };

  const switchRole = (role) => {
    setActiveRole(role);
    setError("");
    setEmail(""); setPassword(""); setConfirmPassword(""); setName("");
    setFacultyName(""); setInstitutionCode(""); setInstitutionName(""); setAdminCode("");
    setCodeValidation(null); setCodeValidationMsg(""); setVerifiedInstitution(null);
  };

  const roleLabels = {
    "institution-faculty": "Institution Faculty",
    "solo-faculty": "Solo Faculty",
    admin: "Administration",
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left animated section ─────────────────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between bg-[#222222] pt-12 px-12 pb-0 text-white">
        <div className="relative z-20">
          <div
            className="flex items-center gap-2 text-xl font-bold tracking-tight cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src="/logo.png" alt="Fathom Logo" className="size-8 object-contain" />
            <span>Fathom</span>
          </div>
        </div>

        {/* Characters */}
        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <div className="relative" style={{ width: "550px", height: "400px" }}>
            {/* Purple */}
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "70px", width: "180px",
                height: isTyping || (password.length > 0 && !showPassword) ? "440px" : "400px",
                backgroundColor: "#6C3FF5", borderRadius: "10px 10px 0 0", zIndex: 1,
                transform: (password.length > 0 && showPassword)
                  ? "skewX(0deg)"
                  : (isTyping || (password.length > 0 && !showPassword))
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "20px" : isLookingAtEachOther ? "55px" : `${45 + purplePos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? "35px" : isLookingAtEachOther ? "65px" : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            {/* Black */}
            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "240px", width: "120px", height: "310px",
                backgroundColor: "#2D2D2D", borderRadius: "8px 8px 0 0", zIndex: 2,
                transform: (password.length > 0 && showPassword)
                  ? "skewX(0deg)"
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || (password.length > 0 && !showPassword))
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "10px" : isLookingAtEachOther ? "32px" : `${26 + blackPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? "28px" : isLookingAtEachOther ? "12px" : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            {/* Orange */}
            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "0px", width: "240px", height: "200px", zIndex: 3,
                backgroundColor: "#FF9B6B", borderRadius: "120px 120px 0 0",
                transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "50px" : `${82 + (orangePos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "85px" : `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : undefined}
                />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : undefined}
                />
              </div>
            </div>

            {/* Yellow */}
            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "310px", width: "140px", height: "230px",
                backgroundColor: "#E8D754", borderRadius: "70px 70px 0 0", zIndex: 4,
                transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "20px" : `${52 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "35px" : `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : undefined}
                />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                  forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : undefined}
                />
              </div>
              <div
                className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? "10px" : `${40 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? "88px" : `${88 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form section ────────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </button>

          <div className="lg:hidden flex items-center justify-center gap-2 text-xl font-bold tracking-tight mb-8 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Fathom Logo" className="size-8 object-contain" />
            <span className="text-gray-900">Fathom</span>
          </div>

          {/* Role tabs */}
          <div className="flex rounded-xl bg-gray-200/70 p-1 mb-8">
            {Object.entries(roleLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchRole(key)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${activeRole === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">
              {isSignUp ? "Create an account" : "Welcome back!"}
            </h1>
            <p className="text-sm text-gray-500">
              {isSignUp
                ? `Sign up as ${roleLabels[activeRole]}`
                : `Log in as ${roleLabels[activeRole]}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── SIGN-UP ONLY FIELDS ─────────────────────────────────── */}

            {/* Full Name — admin / institution-faculty sign-up only */}
            {isSignUp && activeRole !== "solo-faculty" && activeRole !== "admin" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input id="name" type="text" placeholder="Fathom User" value={name} autoComplete="off"
                  onChange={(e) => setName(e.target.value)} required
                  className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
                />
              </div>
            )}

            {/* Admin name on sign-up */}
            {isSignUp && activeRole === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input id="name" type="text" placeholder="Administrator Name" value={name} autoComplete="off"
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
                />
              </div>
            )}

            {/* Solo Faculty Name — sign-up only */}
            {isSignUp && activeRole === "solo-faculty" && (
              <div className="space-y-2">
                <Label htmlFor="facultyName" className="text-sm font-medium text-gray-700">
                  Your Faculty Name
                </Label>
                <Input
                  id="facultyName"
                  type="text"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={facultyName}
                  autoComplete="off"
                  onChange={(e) => { setFacultyName(e.target.value); setIsTyping(true); setTimeout(() => setIsTyping(false), 500); }}
                  required
                  className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be used as your faculty profile and cannot be changed later.
                </p>
              </div>
            )}

            {/* Institution Code — always shown for institution-faculty (needed on both sign-up and login) */}
            {activeRole === "institution-faculty" && (
              <>
                <InstitutionCodeField
                  value={institutionCode}
                  onChange={(e) => {
                    setInstitutionCode(e.target.value);
                    setIsTyping(true);
                    setTimeout(() => setIsTyping(false), 500);
                  }}
                  validationState={codeValidation}
                />
                {codeValidationMsg && (
                  <p className={`text-xs mt-1 ${codeValidation === "valid" ? "text-green-600" : "text-red-500"}`}>
                    {codeValidationMsg}
                  </p>
                )}
              </>
            )}

            {/* Institution Name — admin sign-up only */}
            {activeRole === "admin" && isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="institutionName" className="text-sm font-medium text-gray-700">Institution Name</Label>
                <Input id="institutionName" type="text" placeholder="e.g. VIT University"
                  value={institutionName} autoComplete="off"
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
                />
              </div>
            )}

            {/* Admin Code — always shown for admin */}
            {activeRole === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="adminCode" className="text-sm font-medium text-gray-700">Admin Code</Label>
                <Input id="adminCode" type="text" placeholder="Enter admin access code"
                  value={adminCode} autoComplete="off"
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
                />
              </div>
            )}

            {/* ── ALWAYS SHOWN ──────────────────────────────────────── */}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input id="email" type="email" placeholder="fathom_user@gmail.com"
                value={email} autoComplete="off" required
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 focus:border-black bg-white text-gray-900 border-gray-300"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder="••••••••" value={password} required
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10 focus:border-black bg-white text-gray-900 border-gray-300"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-gray-400 hover:text-gray-900"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password — sign-up only */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••" value={confirmPassword} required
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pr-10 focus:border-black bg-white text-gray-900 border-gray-300"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-gray-400 hover:text-gray-900"
                  >
                    {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 text-sm border rounded-lg text-red-600 bg-red-50 border-red-200">
                {error}
              </div>
            )}

            <Button type="submit"
              className="w-full h-12 text-base font-medium bg-black text-white hover:bg-gray-800"
              size="lg"
              disabled={
                isLoading ||
                (activeRole === "institution-faculty" && codeValidation === "invalid") ||
                (activeRole === "solo-faculty" && isSignUp && !facultyName.trim())
              }
            >
              {isLoading
                ? (isSignUp ? "Creating account…" : "Signing in…")
                : (isSignUp ? "Sign up" : "Log in")}
            </Button>
          </form>

          {/* Google sign-in */}
          <div className="mt-6">
            <Button variant="outline"
              className="w-full h-12 hover:bg-gray-100 bg-white text-gray-900 border-gray-300"
              type="button" onClick={handleGoogleSignIn} disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className="mr-2 size-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isSignUp ? "Sign up" : "Log in"} with Google
            </Button>
          </div>

          <div className="text-center text-sm mt-8 text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={toggleAuthMode} className="font-medium hover:underline text-black">
              {isSignUp ? "Log in" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Component = LoginPage;
export default LoginPage;