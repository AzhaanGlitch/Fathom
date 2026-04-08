import React, { useState, useEffect, useRef, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import { Loader, MailCheck, RefreshCw, ShieldCheck, XCircle, AlertCircle } from 'lucide-react';

const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '';

const OTP_EXPIRY_SECONDS = 300;

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const DigitBox = ({ value, inputRef, onChange, onKeyDown, onPaste }) => (
    <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={`
      w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none
      transition-all duration-200 select-none
      bg-white/5 text-white
      ${value
                ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'border-white/20 hover:border-white/40 focus:border-blue-400'
            }
    `}
    />
);

const Countdown = ({ seconds }) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    const isUrgent = seconds <= 60;
    return (
        <span className={`font-mono text-sm font-semibold ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
            {m}:{s}
        </span>
    );
};

const OtpModal = ({ email, userName, onVerified, onCancel }) => {
    const NUM_DIGITS = 6;

    const [digits, setDigits] = useState(Array(NUM_DIGITS).fill(''));
    const [currentOtp, setCurrentOtp] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
    const [expired, setExpired] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef(Array(NUM_DIGITS).fill(null).map(() => React.createRef()));
    const timerRef = useRef(null);
    const cooldownRef = useRef(null);

    const sendOtp = useCallback(async () => {
        const otp = generateOtp();
        setCurrentOtp(otp);
        setSending(true);
        setSendError('');
        setDigits(Array(NUM_DIGITS).fill(''));
        setVerifyError('');
        setExpired(false);
        setTimeLeft(OTP_EXPIRY_SECONDS);

        try {
            if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
                throw new Error('EmailJS is not configured.');
            }

            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: email,
                    email: email,
                    to: email,
                    user_email: email,
                    otp_code: otp,
                    user_name: userName || (email ? email.split('@')[0] : 'User'),
                },
                EMAILJS_PUBLIC_KEY,
            );
        } catch (err) {
            console.error('EmailJS error:', err);
            setSendError(err?.text || err?.message || 'Failed to send verification email. Please try again.');
        } finally {
            setSending(false);
        }
    }, [email, userName]);

    useEffect(() => {
        sendOtp();
        setTimeout(() => inputRefs.current[0]?.current?.focus(), 300);
    }, [sendOtp]);

    useEffect(() => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    setExpired(true);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [currentOtp]);

    const startResendCooldown = useCallback(() => {
        setResendCooldown(30);
        clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(c => {
                if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
                return c - 1;
            });
        }, 1000);
    }, []);

    const handleResend = useCallback(async () => {
        if (resendCooldown > 0 || sending) return;
        startResendCooldown();
        await sendOtp();
        setTimeout(() => inputRefs.current[0]?.current?.focus(), 300);
    }, [resendCooldown, sending, sendOtp, startResendCooldown]);

    const handleChange = (index, e) => {
        const val = e.target.value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = val;
        setDigits(next);
        setVerifyError('');
        if (val && index < NUM_DIGITS - 1) {
            inputRefs.current[index + 1]?.current?.focus();
        }
        if (val && index === NUM_DIGITS - 1) {
            const full = next.join('');
            if (full.length === NUM_DIGITS) verifyOtp(next);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                const next = [...digits];
                next[index - 1] = '';
                setDigits(next);
                inputRefs.current[index - 1]?.current?.focus();
            } else {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            }
            setVerifyError('');
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.current?.focus();
        } else if (e.key === 'ArrowRight' && index < NUM_DIGITS - 1) {
            inputRefs.current[index + 1]?.current?.focus();
        } else if (e.key === 'Enter') {
            const full = digits.join('');
            if (full.length === NUM_DIGITS) verifyOtp(digits);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, NUM_DIGITS);
        if (!pasted) return;
        const next = Array(NUM_DIGITS).fill('');
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        setVerifyError('');
        const focusIdx = Math.min(pasted.length, NUM_DIGITS - 1);
        inputRefs.current[focusIdx]?.current?.focus();
        if (pasted.length === NUM_DIGITS) verifyOtp(next);
    };

    const verifyOtp = useCallback((digitArr = digits) => {
        if (expired) { setVerifyError('OTP has expired. Please request a new one.'); return; }
        const entered = digitArr.join('');
        if (entered.length < NUM_DIGITS) { setVerifyError('Please enter all 6 digits.'); return; }

        setVerifying(true);
        setVerifyError('');

        setTimeout(() => {
            if (entered === currentOtp) {
                setVerified(true);
                clearInterval(timerRef.current);
                setTimeout(() => onVerified(), 900);
            } else {
                setVerifyError('Incorrect code. Please try again.');
                setDigits(Array(NUM_DIGITS).fill(''));
                inputRefs.current[0]?.current?.focus();
            }
            setVerifying(false);
        }, 400);
    }, [digits, currentOtp, expired, onVerified]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={!verified ? onCancel : undefined} />
            <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
                {!verified && (
                    <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors" title="Cancel sign-up">
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${verified ? 'bg-green-500/20 border border-green-500/30' : 'bg-blue-500/20 border border-blue-500/30'}`}>
                    {verified ? <ShieldCheck className="w-8 h-8 text-green-400" /> : <MailCheck className="w-8 h-8 text-blue-400" />}
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">{verified ? 'Verified!' : 'Check your email'}</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        {verified ? 'Your account is now confirmed. Setting things up…' : (
                            <>We sent a 6-digit code to <span className="text-white font-medium break-all">{email}</span></>
                        )}
                    </p>
                </div>
                {sending && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                        <Loader className="w-4 h-4 animate-spin" /> Sending verification email…
                    </div>
                )}
                {sendError && !sending && (
                    <div className="w-full flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{sendError}</span>
                    </div>
                )}
                {!verified && !sending && (
                    <>
                        <div className="flex gap-3">
                            {digits.map((d, i) => (
                                <DigitBox key={i} value={d} inputRef={inputRefs.current[i]} onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} />
                            ))}
                        </div>
                        {verifyError && (
                            <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{verifyError}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            {expired ? <span className="text-red-400 font-medium">Code expired</span> : (
                                <><span className="text-gray-500">Expires in</span> <Countdown seconds={timeLeft} /></>
                            )}
                        </div>
                        <button onClick={() => verifyOtp()} disabled={verifying || digits.join('').length < NUM_DIGITS || expired} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                            {verifying ? <><Loader className="w-4 h-4 animate-spin" />Verifying…</> : 'Verify Email'}
                        </button>
                        <p className="text-sm text-gray-500">
                            Didn't receive it?{' '}
                            <button onClick={handleResend} disabled={resendCooldown > 0 || sending} className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <><RefreshCw className="w-3.5 h-3.5" />Resend code</>}
                            </button>
                        </p>
                    </>
                )}
                {verified && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-green-500/30 animate-ping absolute inset-0" />
                            <div className="w-8 h-8 rounded-full bg-green-500/20 relative" />
                        </div>
                        <p className="text-sm text-green-400 font-medium">Redirecting to dashboard…</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OtpModal;
