import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, Shield, LogIn, ArrowUp, MapPin, Calendar, Rocket, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import mapSvg from '@/assets/map-v5.svg';
import kaminoSvg from '@/assets/kamino300x100.svg';
import aaveImg from '@/assets/aave.avif';
import compoundImg from '@/assets/compound.avif';
import efImg from '@/assets/EF.avif';
import morphoImg from '@/assets/morpho.avif';
import balancerImg from '@/assets/balanceer.avif';
import cblightImg from '@/assets/cblight.avif';
import makerImg from '@/assets/maker.avif';

export default function HomePage() {
    const navigate = useNavigate();
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [activeSection, setActiveSection] = useState<string>('');
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();
    const rafRef = useRef<number>();

    useEffect(() => {
        let ticking = false;
        
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setShowBackToTop(window.scrollY > 300);
                    setIsScrolling(true);
                    
                    if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current);
                    }
                    scrollTimeoutRef.current = setTimeout(() => {
                        setIsScrolling(false);
                    }, 150);
                    
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const sections = ['performance', 'dao', 'features', 'roadmap', 'partners'];
        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -50% 0px',
            threshold: 0.2,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach((sectionId) => {
            const element = document.getElementById(sectionId);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerHeight = 64; // h-16 = 4rem = 64px
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex flex-1 flex-col" style={{ scrollBehavior: 'smooth' }}>
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 lg:px-6">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">A</span>
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400 bg-clip-text text-transparent">
                                    Aureus
                                </span>
                            </div>
                        </div>
                        
                        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
                            <button
                                onClick={() => scrollToSection('performance')}
                                className={`text-sm font-medium transition-all duration-300 relative ${
                                    activeSection === 'performance'
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Products
                                {activeSection === 'performance' && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-in slide-in-from-left duration-300" />
                                )}
                            </button>
                            <button
                                onClick={() => scrollToSection('dao')}
                                className={`text-sm font-medium transition-all duration-300 relative ${
                                    activeSection === 'dao'
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                DAO
                                {activeSection === 'dao' && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-in slide-in-from-left duration-300" />
                                )}
                            </button>
                            <button
                                onClick={() => scrollToSection('features')}
                                className={`text-sm font-medium transition-all duration-300 relative ${
                                    activeSection === 'features'
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Features
                                {activeSection === 'features' && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-in slide-in-from-left duration-300" />
                                )}
                            </button>
                            <button
                                onClick={() => scrollToSection('roadmap')}
                                className={`text-sm font-medium transition-all duration-300 relative ${
                                    activeSection === 'roadmap'
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Roadmap
                                {activeSection === 'roadmap' && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-in slide-in-from-left duration-300" />
                                )}
                            </button>
                            <button
                                onClick={() => scrollToSection('partners')}
                                className={`text-sm font-medium transition-all duration-300 relative ${
                                    activeSection === 'partners'
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Partners
                                {activeSection === 'partners' && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-in slide-in-from-left duration-300" />
                                )}
                            </button>
                        </nav>
                        
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/login')}
                                className="hidden sm:flex"
                            >
                                Sign In
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => navigate('/app')}
                                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                            >
                                <LogIn className="w-4 h-4 mr-2" />
                                Go to D-App
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 flex-col">
                <div className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-black">
                    <div className="absolute inset-0 overflow-hidden" style={{ contain: 'layout style paint' }}>
                        <div className="absolute inset-0" style={{
                            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                        }} />
                        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.6, willChange: 'auto' }}>
                            <defs>
                                <radialGradient id="particleGradient">
                                    <stop offset="0%" stopColor="rgba(147, 197, 253, 0.8)" />
                                    <stop offset="50%" stopColor="rgba(96, 165, 250, 0.4)" />
                                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                                </radialGradient>
                            </defs>
                            {useMemo(() => {
                                return Array.from({ length: 80 }).map((_, i) => {
                                    const angle = (i / 80) * Math.PI * 2;
                                    const radius = 200 + Math.random() * 300;
                                    const x = 50 + Math.cos(angle) * (radius / 10);
                                    const y = 50 + Math.sin(angle) * (radius / 10);
                                    const size = Math.random() * 1.5 + 0.5;
                                    const delay = Math.random() * 3;
                                    const duration = 4 + Math.random() * 2;
                                    const moveX = Math.random() * 10 - 5;
                                    const moveY = Math.random() * 10 - 5;
                                    const opacity = 0.4 + Math.random() * 0.4;
                                    
                                    return { i, x, y, size, delay, duration, moveX, moveY, opacity };
                                });
                            }, []).map((particle) => (
                                <circle
                                    key={particle.i}
                                    cx={`${particle.x}%`}
                                    cy={`${particle.y}%`}
                                    r={particle.size}
                                    fill="url(#particleGradient)"
                                    opacity={particle.opacity}
                                    style={{
                                        animation: `particleFloat${particle.i} ${particle.duration}s ease-in-out infinite`,
                                        animationDelay: `${particle.delay}s`,
                                        willChange: 'transform, opacity',
                                    }}
                                >
                                    <style>{`
                                        @keyframes particleFloat${particle.i} {
                                            0%, 100% {
                                                transform: translate(0, 0) scale(1);
                                                opacity: ${particle.opacity};
                                            }
                                            50% {
                                                transform: translate(${particle.moveX}px, ${particle.moveY}px) scale(1.1);
                                                opacity: ${Math.min(particle.opacity * 1.5, 1)};
                                            }
                                        }
                                    `}</style>
                                </circle>
                            ))}
                        </svg>
                    </div>
                    
                    <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
                        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
                            <div className="relative">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-pulse">
                                        <div className="absolute inset-0 rounded-full bg-yellow-300/25 blur-3xl" />
                                        <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-3xl" />
                                    </div>
                                    
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                        {useMemo(() => {
                                            return Array.from({ length: 12 }).map((_, i) => {
                                                const angle = (Math.random() * 360) * (Math.PI / 180);
                                                const distance = 250 + Math.random() * 400;
                                                const duration = 5 + Math.random() * 3;
                                                const delay = 2 + Math.random() * 2;
                                                const size = 2 + Math.random() * 3;
                                                const endX = Math.cos(angle) * distance;
                                                const endY = Math.sin(angle) * distance;
                                                
                                                return { i, angle, distance, duration, delay, size, endX, endY };
                                            });
                                        }, []).map((star) => (
                                            <div
                                                key={star.i}
                                                className="absolute rounded-full"
                                                style={{
                                                    left: '50%',
                                                    top: '50%',
                                                    width: `${star.size}px`,
                                                    height: `${star.size}px`,
                                                    background: `radial-gradient(circle, rgba(251, 191, 36, 1) 0%, rgba(245, 158, 11, 0.6) 50%, transparent 100%)`,
                                                    boxShadow: `0 0 ${star.size * 2}px rgba(251, 191, 36, 0.8)`,
                                                    willChange: 'transform, opacity',
                                                    transform: 'translate(-50%, -50%)',
                                                    animation: `starEmit${star.i} ${star.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                                                    animationDelay: `${star.delay}s`,
                                                    opacity: 0,
                                                    contain: 'layout style paint',
                                                }}
                                            >
                                                <style>{`
                                                    @keyframes starEmit${star.i} {
                                                        0% {
                                                            opacity: 0;
                                                            transform: translate(-50%, -50%) scale(0.8);
                                                        }
                                                        5% {
                                                            opacity: 1;
                                                            transform: translate(-50%, -50%) scale(1);
                                                        }
                                                        30% {
                                                            opacity: 0.8;
                                                            transform: translate(calc(-50% + ${star.endX * 0.3}px), calc(-50% + ${star.endY * 0.3}px)) scale(1.2);
                                                        }
                                                        60% {
                                                            opacity: 0.5;
                                                            transform: translate(calc(-50% + ${star.endX * 0.7}px), calc(-50% + ${star.endY * 0.7}px)) scale(1.3);
                                                        }
                                                        90% {
                                                            opacity: 0.2;
                                                            transform: translate(calc(-50% + ${star.endX}px), calc(-50% + ${star.endY}px)) scale(1);
                                                        }
                                                        100% {
                                                            opacity: 0;
                                                            transform: translate(calc(-50% + ${star.endX * 1.2}px), calc(-50% + ${star.endY * 1.2}px)) scale(0.2);
                                                        }
                                                    }
                                                `}</style>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <style>
                                            {`
                                                @keyframes floatInCenter {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateY(30px) scale(0.8);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateY(0) scale(1);
                                                    }
                                                }
                                                @keyframes floatInMiddle {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateX(-40px) rotate(-10deg);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateX(0) rotate(0deg);
                                                    }
                                                }
                                                @keyframes floatInOuter {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateY(-50px) rotate(10deg);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateY(0) rotate(0deg);
                                                    }
                                                }
                                                .diamond-center {
                                                    animation: floatInCenter 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 0.2s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                                .diamond-middle {
                                                    animation: floatInMiddle 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 0.8s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                                .diamond-outer {
                                                    animation: floatInOuter 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 1.4s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                            `}
                                        </style>
                                        <svg
                                            width="400"
                                            height="400"
                                            viewBox="0 0 200 200"
                                            className="drop-shadow-xl"
                                        >
                                            <path
                                                d="M100 20 L180 100 L100 180 L20 100 Z"
                                                fill="#F6D365"
                                                className="diamond-outer"
                                                fillOpacity="0.85"
                                            />
                                            <path
                                                d="M100 50 L150 100 L100 150 L50 100 Z"
                                                fill="#D4A84B"
                                                className="diamond-middle"
                                                fillOpacity="0.9"
                                            />
                                            <path
                                                d="M100 75 L125 100 L100 125 L75 100 Z"
                                                fill="#B8860B"
                                                className="diamond-center"
                                                fillOpacity="0.95"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
                            <div className="w-full max-w-2xl space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
                                        Simple staking with
                                    </h1>
                                    <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent lg:text-6xl">
                                        AUR
                                    </h1>
                                </div>

                                <p className="text-lg text-gray-300">
                                    Empowering and securing AUR since 2026
                                </p>

                                <div className="flex flex-wrap items-end gap-8">
                                    <div className="space-y-1">
                                        <div className="text-3xl font-bold text-white lg:text-4xl">APR: 2.4%</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="text-3xl font-bold text-white lg:text-4xl">
                                            TVL: $24.0900.897
                                        </div>
                                    </div>

                                    <Button 
                                        variant="outline" 
                                        className="rounded-full px-6 group border-gray-700 text-white hover:bg-gray-800"
                                        onClick={() => navigate('/app')}
                                    >
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Go to D-App
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="performance" className="relative py-20 px-8 lg:px-12">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-8">
                            The Most Performant Node<br />
                            Operator Set at Scale
                        </h2>

                        <div className="grid lg:grid-cols-5 gap-8">
                            <div className="lg:col-span-3 relative">
                                <h3 className="text-xl font-semibold mb-2">Geographical diversity</h3>
                                <p className="text-sm text-muted-foreground mb-6">Curated & Simple DVT modules</p>
                                
                                <div className="relative">
                                    <img 
                                        src={mapSvg} 
                                        alt="Geographical diversity map" 
                                        className="w-full h-full object-contain"
                                    />
                                    
                                    {/* Twinkling stars on map */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {useMemo(() => {
                                            return Array.from({ length: 10 }).map((_, i) => {
                                                const left = 15 + Math.random() * 70;
                                                const top = 15 + Math.random() * 70;
                                                const delay = Math.random() * 2;
                                                const duration = 2.5 + Math.random() * 1;
                                                
                                                return { i, left, top, delay, duration };
                                            });
                                        }, []).map((star) => (
                                            <div
                                                key={star.i}
                                                className="absolute rounded-full"
                                                style={{
                                                    left: `${star.left}%`,
                                                    top: `${star.top}%`,
                                                    width: '4px',
                                                    height: '4px',
                                                    background: 'radial-gradient(circle, rgba(251, 191, 36, 1) 0%, rgba(245, 158, 11, 0.6) 50%, transparent 100%)',
                                                    boxShadow: '0 0 6px rgba(251, 191, 36, 0.8), 0 0 12px rgba(245, 158, 11, 0.4)',
                                                    animation: `twinkle ${star.duration}s ease-in-out infinite`,
                                                    animationDelay: `${star.delay}s`,
                                                    willChange: 'opacity, transform',
                                                    contain: 'layout style paint',
                                                }}
                                            >
                                                <style>{`
                                                    @keyframes twinkle {
                                                        0%, 100% {
                                                            opacity: 0.3;
                                                            transform: scale(0.8);
                                                        }
                                                        50% {
                                                            opacity: 1;
                                                            transform: scale(1.2);
                                                        }
                                                    }
                                                `}</style>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <Card className="h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-0 shadow-lg">
                                    <CardContent className="p-8 space-y-8">
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Aureus Validator Set Performance</p>
                                            <p className="text-3xl font-bold">97.35%</p>
                                            <p className="text-sm text-muted-foreground mt-1">Network performance 96.70%</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Active Validators</p>
                                            <p className="text-3xl font-bold">2,847</p>
                                            <p className="text-sm text-muted-foreground mt-1">Distributed across global network</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Uptime</p>
                                            <p className="text-3xl font-bold">99.9%</p>
                                            <p className="text-sm text-muted-foreground mt-1">Average validator availability</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Node Operators</p>
                                            <p className="text-3xl font-bold">800+</p>
                                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                                A vast array of independent Node Operators, from professionals to home stakers, use the Aureus protocol via permissioned and permissionless modules.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="dao" className="relative py-24 px-8 lg:px-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/50 to-amber-50/30 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-amber-950/10" />
                    
                    <div className="relative mx-auto max-w-6xl">
                        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
                            <div className="lg:w-2/5 flex-shrink-0">
                                <div className="relative inline-block">
                                    <span className="absolute -top-2 -left-4 text-2xl text-muted-foreground/40 font-light">┌</span>
                                    <span className="absolute -bottom-2 -left-4 text-2xl text-muted-foreground/40 font-light">└</span>
                                    
                                    <div className="pl-4">
                                        <p className="text-[11px] tracking-[0.35em] text-muted-foreground mb-5">GOVERNED BY</p>
                                        <h2 className="text-[4rem] lg:text-[5rem] font-black tracking-tighter leading-[0.85] mb-6">
                                            AUREUS<br />DAO
                                        </h2>
                                    </div>
                                </div>
                                
                                <p className="text-[11px] tracking-[0.2em] text-muted-foreground/70 leading-relaxed mt-8">
                                    MISSION-DRIVEN<br />
                                    DECENTRALIZED<br />
                                    ORGANIZATION
                                </p>
                            </div>

                            <div className="lg:w-3/5 space-y-12">
                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                                        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Non-custodial</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Aureus protocol's design ensures no one can access or control stakers' funds
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/40 flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Transparent</h3>
                                        <p className="text-muted-foreground leading-relaxed mb-5">
                                            Key decisions require public votes by AUR token holders, ensuring accountability to both users and the wider community
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-300/40 to-pink-300/40 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Resilient</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Whether it is governance, geographic/jurisdictional diversity, or node software, Aureus ecosystem participants are always pushing to make the protocol more resilient
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="roadmap" className="relative py-20 px-8 lg:px-12 bg-background">
                    <div className="relative mx-auto max-w-6xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-3">
                                Roadmap
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Our journey to build the most performant and decentralized staking platform
                            </p>
                        </div>

                        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                            {[
                                { 
                                    phase: 'Q1 2026',
                                    season: 'Spring',
                                    seasonVi: '-',
                                    title: 'Launch & Foundation', 
                                    items: ['Platform launch', 'Initial validator set', 'Core staking features'],
                                    status: 'completed',
                                    icon: Rocket,
                                    colors: {
                                        bg: 'from-emerald-50 via-pink-50 to-rose-50 dark:from-emerald-950/30 dark:via-pink-950/20 dark:to-rose-950/20',
                                        border: 'border-emerald-200/60 dark:border-emerald-700/40',
                                        icon: 'bg-gradient-to-br from-emerald-400 to-pink-400 text-white',
                                        accent: 'from-emerald-400/30 to-pink-400/30',
                                        glow: 'shadow-emerald-500/20 dark:shadow-emerald-500/10'
                                    }
                                },
                                { 
                                    phase: 'Q2 2026',
                                    season: 'Summer',
                                    seasonVi: '-',
                                    title: 'Expansion', 
                                    items: ['Multi-chain support', 'Enhanced security', 'Governance framework'],
                                    status: 'in-progress',
                                    icon: MapPin,
                                    colors: {
                                        bg: 'from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20',
                                        border: 'border-amber-200/60 dark:border-amber-700/40',
                                        icon: 'bg-gradient-to-br from-amber-400 to-orange-400 text-white',
                                        accent: 'from-amber-400/30 to-orange-400/30',
                                        glow: 'shadow-amber-500/20 dark:shadow-amber-500/10'
                                    }
                                },
                                { 
                                    phase: 'Q3 2026',
                                    season: 'Fall',
                                    seasonVi: '-',
                                    title: 'Innovation', 
                                    items: ['Advanced analytics', 'Mobile app', 'API integrations'],
                                    status: 'upcoming',
                                    icon: Calendar,
                                    colors: {
                                        bg: 'from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/30 dark:via-red-950/20 dark:to-rose-950/20',
                                        border: 'border-orange-200/60 dark:border-orange-700/40',
                                        icon: 'bg-gradient-to-br from-orange-400 to-red-400 text-white',
                                        accent: 'from-orange-400/30 to-red-400/30',
                                        glow: 'shadow-orange-500/20 dark:shadow-orange-500/10'
                                    }
                                },
                                { 
                                    phase: 'Q4 2026',
                                    season: 'Winter',
                                    seasonVi: '-',
                                    title: 'Ecosystem Growth', 
                                    items: ['Partner integrations', 'Community programs', 'Global expansion'],
                                    status: 'upcoming',
                                    icon: Users,
                                    colors: {
                                        bg: 'from-blue-50 via-cyan-50 to-indigo-50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-indigo-950/20',
                                        border: 'border-blue-200/60 dark:border-blue-700/40',
                                        icon: 'bg-gradient-to-br from-blue-400 to-cyan-400 text-white',
                                        accent: 'from-blue-400/30 to-cyan-400/30',
                                        glow: 'shadow-blue-500/20 dark:shadow-blue-500/10'
                                    }
                                },
                            ].map((milestone, index) => {
                                const isHovered = hoveredCard === index;
                                const hasHovered = hoveredCard !== null;
                                
                                return (
                                <div
                                    key={index}
                                    onMouseEnter={() => setHoveredCard(index)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    className={`group relative rounded-3xl bg-gradient-to-br ${milestone.colors.bg} border ${milestone.colors.border} backdrop-blur-sm overflow-hidden ${
                                        isHovered 
                                            ? 'z-50 shadow-2xl' 
                                            : hasHovered 
                                            ? 'z-10' 
                                            : 'z-20'
                                    } ${milestone.colors.glow}`}
                                    style={{
                                        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                                        transform: isHovered ? 'scale(1.03) translateY(-4px)' : hasHovered ? 'scale(0.98) translateY(0)' : 'scale(1) translateY(0)',
                                        opacity: isHovered ? 1 : hasHovered ? 0.5 : 1,
                                        filter: isHovered || isScrolling ? 'none' : hasHovered ? 'blur(2px)' : 'none',
                                        transition: isScrolling ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out, filter 0.4s ease-out',
                                        willChange: isHovered || hasHovered ? 'transform, opacity' : 'auto',
                                        contain: 'layout style paint',
                                    }}
                                >
                                    <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${milestone.colors.accent} rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse`} />
                                    <div className={`absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br ${milestone.colors.accent} rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`} />
                                    
                                    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
                                        <div className="absolute inset-0" style={{
                                            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                                            backgroundSize: '24px 24px'
                                        }} />
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    
                                    <div className="relative z-10 p-6 lg:p-8">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`relative w-14 h-14 rounded-2xl ${milestone.colors.icon} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                                    {milestone.status === 'completed' ? (
                                                        <CheckCircle2 className="w-7 h-7" />
                                                    ) : (
                                                        <milestone.icon className="w-7 h-7" />
                                                    )}
                                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${milestone.colors.accent} blur-xl opacity-50 group-hover:opacity-70 transition-opacity`} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                                                        {milestone.seasonVi} • {milestone.season}
                                                    </div>
                                                    <div className="text-base font-bold text-foreground">{milestone.phase}</div>
                                                </div>
                                            </div>
                                            {milestone.status === 'in-progress' && (
                                                <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-700 dark:text-amber-400 font-semibold border border-amber-300/30 dark:border-amber-600/30 backdrop-blur-sm">
                                                    In Progress
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-2xl font-bold mb-5 text-foreground group-hover:text-opacity-90 transition-colors">
                                            {milestone.title}
                                        </h3>
                                        
                                        <ul className="space-y-3">
                                            {milestone.items.map((item, i) => (
                                                <li 
                                                    key={i} 
                                                    className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors"
                                                    style={{
                                                        animation: `fadeInLeft 0.5s ease-out ${(index * 0.1) + (i * 0.1) + 0.3}s both`
                                                    }}
                                                >
                                                    <div className={`relative flex-shrink-0 w-2 h-2 rounded-full ${milestone.colors.icon.replace('bg-gradient-to-br ', 'bg-').split(' ')[0]}`}>
                                                        <div className={`absolute inset-0 rounded-full ${milestone.colors.icon.replace('bg-gradient-to-br ', 'bg-').split(' ')[0]} animate-ping opacity-75`} />
                                                    </div>
                                                    <span className="leading-relaxed">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    <style>{`
                                        @keyframes fadeInUp {
                                            from {
                                                opacity: 0;
                                                transform: translateY(20px);
                                            }
                                            to {
                                                opacity: 1;
                                                transform: translateY(0);
                                            }
                                        }
                                        @keyframes fadeInLeft {
                                            from {
                                                opacity: 0;
                                                transform: translateX(-10px);
                                            }
                                            to {
                                                opacity: 1;
                                                transform: translateX(0);
                                            }
                                        }
                                    `}</style>
                                </div>
                            );
                            })}
                        </div>
                    </div>
                </div>

                <div id="partners" className="relative py-20 px-8 lg:px-12 bg-muted/20 mt-16">
                    <div className="relative mx-auto max-w-7xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-3">
                                Our Partners
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Trusted by leading organizations in the blockchain ecosystem
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                            {[
                                { name: 'Ethereum Foundation', logo: efImg },
                                { name: 'Aave', logo: aaveImg },
                                { name: 'Compound', logo: compoundImg },
                                { name: 'Morpho', logo: morphoImg },
                                { name: 'Balancer', logo: balancerImg },
                                { name: 'Coinbase', logo: cblightImg },
                                { name: 'Maker', logo: makerImg },
                                { name: 'Kamino', logo: kaminoSvg, isSvg: true },
                            ].map((partner, index) => (
                                <Card 
                                    key={index} 
                                    className="border hover:border-primary/50 transition-colors bg-card"
                                >
                                    <CardContent className="p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                                        <div className="w-full h-12 flex items-center justify-center">
                                            {partner.isSvg ? (
                                                <img 
                                                    src={partner.logo} 
                                                    alt={partner.name}
                                                    className="max-w-full max-h-12 object-contain"
                                                />
                                            ) : (
                                                <img 
                                                    src={partner.logo} 
                                                    alt={partner.name}
                                                    className="max-w-full max-h-12 object-contain"
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="relative py-16 px-8 lg:px-12 bg-background border-t">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                            <div>
                                <h3 className="text-lg font-bold mb-4">Aureus</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Empowering and securing AUR since 2026. The most performant staking platform.
                                </p>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate('/app')}
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Go to D-App
                                </Button>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold mb-4">Product</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><a href="/app/stake" className="hover:text-foreground transition-colors">Stake</a></li>
                                    <li><a href="/app/withdrawals" className="hover:text-foreground transition-colors">Withdrawals</a></li>
                                    <li><a href="/app/reward-history" className="hover:text-foreground transition-colors">Claim History</a></li>
                                    <li><a href="/app/yield-staking" className="hover:text-foreground transition-colors">Yield Staking</a></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold mb-4">Company</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold mb-4">Resources</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                                    <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-muted-foreground">
                                © 2026 Aureus. All rights reserved.
                            </p>
                            <div className="flex gap-6 text-sm text-muted-foreground">
                                <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                                <a href="#" className="hover:text-foreground transition-colors">Discord</a>
                                <a href="https://github.com/bzetsu92" className="hover:text-foreground transition-colors">GitHub</a>
                                <a href="#" className="hover:text-foreground transition-colors">Medium</a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {showBackToTop && (
                <Button
                    onClick={scrollToTop}
                    size="icon"
                    className="fixed bottom-8 right-8 rounded-full shadow-lg z-50 h-12 w-12"
                    aria-label="Back to top"
                >
                    <ArrowUp className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}
