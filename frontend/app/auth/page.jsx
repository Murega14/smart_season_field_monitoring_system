"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/signup';

        const payload = isLogin
            ? { email: formData.email, password: formData.password }
            : {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                password: formData.password
            };

        try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                router.push('/dashboard');
            } else {
                setErrorMsg(data.msg || data.error || 'Authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Auth error:', error);
            setErrorMsg('Network error. Please check your connection to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex selection:bg-emerald-200 selection:text-emerald-900">
            <Head>
                <title>{isLogin ? 'Sign In' : 'Create Account'} | SmartSeason</title>
            </Head>

            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--tw-gradient-stops))] from-emerald-900/40 via-slate-900 to-slate-900 z-0"></div>

                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[120px] rounded-full z-0"></div>
                <div className="absolute bottom-10 left-10 w-[40%] h-[40%] bg-teal-600/20 blur-[100px] rounded-full z-0"></div>

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3 w-max">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">SmartSeason</span>
                    </Link>
                </div>

                <div className="relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 text-sm font-semibold mb-6">
                        Field Intelligence
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                        Manage your harvest <br />with <span className="text-emerald-500">precision.</span>
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        The all-in-one architecture OS for agricultural firms. Track planting, manage field agents, and mitigate risks in real-time.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-slate-500 font-medium">
                    © {new Date().getFullYear()} SmartSeason.
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="absolute top-6 left-6 lg:hidden z-20">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-slate-900">SmartSeason</span>
                    </Link>
                </div>

                <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                            {isLogin ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="text-slate-500">
                            {isLogin
                                ? 'Enter your details to access your dashboard.'
                                : 'Enter your details to register as an administrator.'}
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm text-red-800 font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        required={!isLogin}
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                        placeholder="Jane"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        required={!isLogin}
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                {isLogin && (
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                )}
                            </div>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-slate-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg('');
                                setFormData({ firstName: '', lastName: '', email: '', password: '' });
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors ml-1"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 leading-relaxed text-center">
                            Demo Credentials:<br />
                            <span className="font-mono font-bold text-slate-700">admin@smartseason.com</span> / <span className="font-mono font-bold text-slate-700">admin123</span><br></br>
                            <span className="font-mono font-bold text-slate-700">john.agent@smartseason.com</span> / <span className="font-mono font-bold text-slate-700">agent123</span>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}