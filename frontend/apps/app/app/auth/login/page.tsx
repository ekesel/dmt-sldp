'use client';
import React, { useState, Suspense, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dancing_Script } from 'next/font/google';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Lock, Loader2, AlertCircle, User, Info, Zap, Users, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const dancingScript = Dancing_Script({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
});

interface Bubble {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    alpha: number;
    decay: number;
    color: string;
    wobble: number;
    wobbleSpeed: number;
}

function CursorBubbles() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let bubbles: Bubble[] = [];
        let lastMousePos = { x: -100, y: -100 };
        let hasMoved = false;

        const handleResize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        const colors = [
            'rgba(40, 138, 198, ',   // primary blue #288ac6
            'rgba(75, 163, 217, ',   // primary tint 1
            'rgba(126, 195, 235, ',  // primary tint 2
            'rgba(186, 224, 246, ',  // soft primary light
            'rgba(255, 255, 255, ',  // white glow
        ];

        const createBubble = (x: number, y: number, speedMultiplier = 1, sizeMultiplier = 1) => {
            const initialRadius = (Math.random() * 7 + 3.5) * sizeMultiplier;
            const colorPrefix = colors[Math.floor(Math.random() * colors.length)];
            bubbles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                radius: initialRadius,
                vx: ((Math.random() - 0.5) * 1.4) * speedMultiplier,
                vy: (-Math.random() * 1.8 - 0.6) * speedMultiplier,
                alpha: Math.random() * 0.45 + 0.4,
                decay: Math.random() * 0.012 + 0.009,
                color: colorPrefix,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.06 + 0.02,
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 6 || !hasMoved) {
                const count = Math.min(Math.floor(dist / 12) + 1, 3);
                for (let i = 0; i < count; i++) {
                    createBubble(e.clientX, e.clientY);
                }
                lastMousePos = { x: e.clientX, y: e.clientY };
                hasMoved = true;
            }
        };

        const handleClick = (e: MouseEvent) => {
            for (let i = 0; i < 9; i++) {
                createBubble(e.clientX, e.clientY, 1.8, 1.2);
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('click', handleClick, { passive: true });

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = bubbles.length - 1; i >= 0; i--) {
                const b = bubbles[i];
                b.wobble += b.wobbleSpeed;
                b.x += b.vx + Math.sin(b.wobble) * 0.5;
                b.y += b.vy;
                b.alpha -= b.decay;
                b.radius = Math.max(0, b.radius - 0.015);

                if (b.alpha <= 0 || b.radius <= 0) {
                    bubbles.splice(i, 1);
                    continue;
                }

                // Draw Bubble Body
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fillStyle = `${b.color}${b.alpha * 0.35})`;
                ctx.fill();

                // Draw Bubble Outer Ring
                ctx.strokeStyle = `${b.color}${b.alpha * 0.85})`;
                ctx.lineWidth = 1.1;
                ctx.stroke();

                // Draw Bubble Specular Highlight (glass reflection)
                ctx.beginPath();
                ctx.arc(
                    b.x - b.radius * 0.35,
                    b.y - b.radius * 0.35,
                    Math.max(0.5, b.radius * 0.28),
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.95})`;
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-50 w-full h-full"
            style={{ pointerEvents: 'none' }}
        />
    );
}

function DotGrid({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            width="220"
            height="220"
            viewBox="0 0 220 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
            <rect width="220" height="220" fill="url(#dot-pattern)" />
        </svg>
    );
}

function WaveMeshGraphic() {
    return (
        <motion.svg
            className="absolute bottom-0 right-0 w-[140%] h-[80%] pointer-events-none opacity-35"
            viewBox="0 0 800 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{
                x: [0, 10, -5, 0],
                y: [0, -8, 4, 0],
            }}
            transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            <defs>
                <linearGradient id="wave-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7ec3eb" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#288ac6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#1a6396" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="wave-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1f6f9f" stopOpacity="0.6" />
                    <stop offset="60%" stopColor="#288ac6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#bae0f6" stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path
                d="M100 600 C 250 520, 350 400, 480 320 C 610 240, 720 180, 800 120"
                stroke="url(#wave-grad-1)"
                strokeWidth="1.5"
                fill="none"
            />
            <path
                d="M140 600 C 280 500, 380 380, 520 300 C 650 220, 740 160, 800 90"
                stroke="url(#wave-grad-1)"
                strokeWidth="1.2"
                fill="none"
            />
            <path
                d="M180 600 C 310 480, 410 360, 550 280 C 680 200, 760 140, 800 60"
                stroke="url(#wave-grad-1)"
                strokeWidth="1"
                fill="none"
            />
            <path
                d="M220 600 C 340 460, 440 340, 580 260 C 710 180, 780 120, 800 30"
                stroke="url(#wave-grad-2)"
                strokeWidth="1.2"
                fill="none"
            />
            <path
                d="M260 600 C 370 440, 470 320, 610 240 C 730 160, 790 100, 800 0"
                stroke="url(#wave-grad-2)"
                strokeWidth="1.5"
                fill="none"
            />
            <path
                d="M300 600 C 400 420, 500 300, 640 220 C 750 140, 795 80, 800 -30"
                stroke="url(#wave-grad-2)"
                strokeWidth="1"
                fill="none"
            />
            <path
                d="M60 600 C 200 550, 300 440, 440 350 C 570 260, 700 200, 800 150"
                stroke="url(#wave-grad-1)"
                strokeWidth="1.8"
                fill="none"
            />
            <path
                d="M20 600 C 160 570, 260 470, 400 380 C 540 290, 670 230, 800 180"
                stroke="url(#wave-grad-2)"
                strokeWidth="1.5"
                fill="none"
            />
        </motion.svg>
    );
}

function RightBackgroundGraphic() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            {/* Soft Ambient Organic Fluid Wave */}
            <motion.svg
                className="absolute -left-24 top-1/4 w-[130%] h-[120%] opacity-50 md:opacity-70"
                viewBox="0 0 1000 800"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                animate={{
                    y: [0, -10, 0],
                    scale: [1, 1.015, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <defs>
                    <linearGradient id="soft-bg-wave-1" x1="0%" y1="20%" x2="100%" y2="80%">
                        <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
                        <stop offset="50%" stopColor="#bae0f6" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="soft-bg-wave-2" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#bae0f6" stopOpacity="0.35" />
                        <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0 240 C 220 160, 360 320, 540 460 C 720 600, 860 640, 1000 670 L 1000 800 L 0 800 Z"
                    fill="url(#soft-bg-wave-1)"
                />
                <path
                    d="M0 360 C 180 300, 320 430, 500 540 C 680 650, 840 700, 1000 730 L 1000 800 L 0 800 Z"
                    fill="url(#soft-bg-wave-2)"
                />
            </motion.svg>

            {/* Glowing Wave Mesh Lines across the card backdrop */}
            <motion.svg
                className="absolute right-0 bottom-0 w-[110%] h-[75%] opacity-35 md:opacity-50"
                viewBox="0 0 900 650"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                animate={{
                    x: [0, -8, 0],
                    y: [0, 6, 0],
                }}
                transition={{
                    duration: 9,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <defs>
                    <linearGradient id="right-mesh-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#288ac6" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#4ba3d9" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7ec3eb" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="right-mesh-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1f6f9f" stopOpacity="0.35" />
                        <stop offset="60%" stopColor="#288ac6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#bae0f6" stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0 480 C 200 420, 340 500, 520 400 C 700 300, 800 210, 900 140"
                    stroke="url(#right-mesh-grad-1)"
                    strokeWidth="1.5"
                    fill="none"
                />
                <path
                    d="M0 520 C 230 460, 380 530, 560 440 C 740 350, 830 250, 900 180"
                    stroke="url(#right-mesh-grad-1)"
                    strokeWidth="1.2"
                    fill="none"
                />
                <path
                    d="M0 560 C 260 500, 420 560, 600 480 C 780 400, 850 300, 900 220"
                    stroke="url(#right-mesh-grad-2)"
                    strokeWidth="1.4"
                    fill="none"
                />
                <path
                    d="M0 600 C 290 540, 460 590, 640 520 C 810 450, 870 350, 900 270"
                    stroke="url(#right-mesh-grad-2)"
                    strokeWidth="1.2"
                    fill="none"
                />
                <path
                    d="M0 640 C 320 580, 500 620, 680 560 C 840 490, 890 400, 900 320"
                    stroke="url(#right-mesh-grad-1)"
                    strokeWidth="1.6"
                    fill="none"
                />
            </motion.svg>
        </div>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isLoading: isAuthLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            setInfoMessage('Your session has expired due to inactivity. Please log in again.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(formData.username, formData.password, 'company');
            router.push('/home');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid credentials. Please make sure you are accessing the correct portal.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col lg:flex-row bg-background overflow-hidden relative">
            {/* Interactive Cursor Bubble Trail */}
            <CursorBubbles />

            {/* Left Hero Panel with global primary color palette */}
            <div className="relative w-full lg:w-[42%] xl:w-[40%] bg-gradient-to-br from-[#124068] via-[#1a6396] to-primary flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 overflow-hidden shrink-0 h-full select-none">
                {/* Background decorative dot matrices & wave graphics */}
                <DotGrid className="absolute -bottom-10 -left-10 text-white/15 pointer-events-none" />
                <DotGrid className="absolute top-6 left-8 text-white/10 pointer-events-none" />
                <WaveMeshGraphic />

                {/* Left Top: Branding */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative z-10 flex items-center gap-3 shrink-0"
                >
                    <Image
                        src="/assets/samta.png"
                        alt="Samta Logo"
                        width={160}
                        height={80}
                        className="h-10 sm:h-12 w-auto object-contain shrink-0"
                        priority
                    />
                    <span className="text-white/30 font-light text-sm sm:text-base select-none">|</span>
                    <span className="text-white font-semibold text-sm sm:text-base tracking-wide whitespace-nowrap">Elevate</span>
                    <span className="text-white/30 font-light text-sm sm:text-base select-none">|</span>
                    <span className="text-white/80 text-xs sm:text-sm font-normal whitespace-nowrap">Internal Portal</span>
                </motion.div>

                {/* Left Middle: Hero Header & Features */}
                <div className="relative z-10 my-auto py-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    >
                        <h1 className="text-2xl sm:text-3xl xl:text-[40px] font-bold text-white tracking-tight leading-[1.16]">
                            Welcome back <br />
                            to <span className={`${dancingScript.className} text-accent font-bold text-3xl sm:text-4xl xl:text-[48px] inline-block tracking-normal ml-1`}>Elevate</span>
                        </h1>
                        <p className="mt-2.5 text-xs sm:text-sm text-white/80 max-w-sm xl:max-w-md leading-relaxed">
                            Your workspace for tools, insights and everything you need to do your best.
                        </p>
                    </motion.div>

                    {/* Value Props / Feature List */}
                    <div className="mt-6 xl:mt-8 space-y-3.5 xl:space-y-4 max-w-md">
                        {/* Feature 1 */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
                            whileHover={{ x: 6, transition: { duration: 0.2 } }}
                            className="flex items-start gap-3.5 group cursor-default"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm transition-all group-hover:bg-white/20 group-hover:scale-105 group-hover:border-white/30">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm xl:text-base font-semibold text-white leading-tight">Secure Access</h2>
                                <p className="text-xs text-white/70 mt-0.5 leading-snug">
                                    Enterprise-grade security to keep your data safe
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                            whileHover={{ x: 6, transition: { duration: 0.2 } }}
                            className="flex items-start gap-3.5 group cursor-default"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm transition-all group-hover:bg-white/20 group-hover:scale-105 group-hover:border-white/30">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm xl:text-base font-semibold text-white leading-tight">Built for Efficiency</h2>
                                <p className="text-xs text-white/70 mt-0.5 leading-snug">
                                    Streamlined tools and resources at your fingertips
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
                            whileHover={{ x: 6, transition: { duration: 0.2 } }}
                            className="flex items-start gap-3.5 group cursor-default"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm transition-all group-hover:bg-white/20 group-hover:scale-105 group-hover:border-white/30">
                                <Users className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm xl:text-base font-semibold text-white leading-tight">For Our People</h2>
                                <p className="text-xs text-white/70 mt-0.5 leading-snug">
                                    Empowering teams to achieve more, together
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom spacer */}
                <div className="hidden lg:block h-1 relative z-10" />
            </div>

            {/* Right Form Area */}
            <div className="relative w-full lg:w-[58%] xl:w-[60%] h-full bg-background flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 overflow-hidden">
                {/* Background subtle dot pattern on top-right */}
                <DotGrid className="absolute top-3 right-3 text-slate-300/40 pointer-events-none hidden sm:block z-0" />
                {/* Background wave graphics around & behind the card */}
                <RightBackgroundGraphic />

                {/* Card Container */}
                <div className="w-full max-w-[420px] xl:max-w-[440px] my-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-card rounded-2xl p-6 sm:p-7 xl:p-8 shadow-xl shadow-slate-200/70 border border-border relative z-10 overflow-hidden"
                    >
                        {/* Samta Logo above Sign in */}
                        <div className="flex justify-center mb-4 sm:mb-5">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                className="flex items-center justify-center"
                            >
                                <Image
                                    src="/assets/samta.png"
                                    alt="Samta Logo"
                                    width={440}
                                    height={164}
                                    className="h-16 sm:h-20 w-auto object-contain"
                                    priority
                                />
                            </motion.div>
                        </div>

                        {/* Heading */}
                        <div className="text-center mb-4 sm:mb-5">
                            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                Sign in to Elevate
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Access your company portal</p>
                        </div>

                        {/* Alerts */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -8, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="mb-3.5 bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-start gap-2.5 overflow-hidden"
                                >
                                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-destructive">{error}</p>
                                </motion.div>
                            )}
                            {infoMessage && !error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -8, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="mb-3.5 bg-primary/10 border border-primary/20 rounded-lg p-2.5 flex items-start gap-2.5 overflow-hidden"
                                >
                                    <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-primary">{infoMessage}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
                            {/* Email or Username */}
                            <div className="space-y-1">
                                <label htmlFor="username" className="block text-xs sm:text-sm font-semibold text-slate-700">
                                    Email or Username
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="username"
                                        type="text"
                                        required
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-xs sm:text-sm"
                                        placeholder="ekaansh.sahni@samta.ai"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-slate-700">
                                        Password
                                    </label>
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-[11px] sm:text-xs font-semibold text-primary hover:text-primary/80 hover:underline transition"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full bg-background border border-border rounded-xl pl-9 pr-9 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none text-xs sm:text-sm"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <motion.button
                                        type="button"
                                        whileTap={{ scale: 0.85 }}
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center pt-0.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                                    />
                                    <span className="text-xs sm:text-sm font-medium text-slate-600">Remember me</span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                transition={{ duration: 0.15 }}
                                className="w-full mt-1 bg-primary hover:bg-primary/90 active:bg-[#2072a4] text-primary-foreground font-semibold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </motion.button>
                        </form>

                        {/* Divider */}
                        <div className="my-3.5 sm:my-4 border-t border-border" />

                        {/* Footer text */}
                        <div className="text-center">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Don't have an account?{' '}
                                <Link
                                    href="/auth/register"
                                    className="text-primary font-semibold hover:text-primary/80 hover:underline transition"
                                >
                                    Create account
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Page Bottom Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="w-full pt-1 pb-1 flex flex-wrap items-center justify-center gap-y-1 gap-x-3 text-[11px] sm:text-xs text-muted-foreground text-center select-none"
                >
                    
                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>This is a secure system. Unauthorized access is prohibited.</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen bg-background flex items-center justify-center p-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}



