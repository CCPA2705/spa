
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Loader2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { signInWithEmail } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await signInWithEmail(email);
            if (error) throw error;
            setMessage({ type: 'success', text: 'Đã gửi liên kết đăng nhập đến email của bạn!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi đăng nhập.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 transform transition-all hover:scale-[1.01]">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-spa-100 rounded-full animate-pulse-slow">
                            <Sparkles className="w-8 h-8 text-spa-600" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-spa-600 to-purple-600 font-spa italic">
                        Lotus Spa
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm">Đăng nhập để quản lý hệ thống</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-spa-500 transition-colors" size={20} />
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-spa-500/20 focus:border-spa-500 outline-none transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                            {message.type === 'success' ? '✨' : '⚠️'} {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-spa-600 to-spa-500 hover:from-spa-700 hover:to-spa-600 text-white font-bold rounded-xl shadow-lg shadow-spa-500/30 transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Đang gửi...
                            </>
                        ) : (
                            'Gửi Link Đăng Nhập'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
