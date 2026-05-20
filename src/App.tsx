import React, { useEffect, useState, FormEvent, useMemo, useRef } from 'react';
import { 
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, useAuthState, useCollectionData, 
  doc, getDoc, setDoc, onSnapshot, collection, query, where, 
  addDoc, serverTimestamp, deleteDoc, getDocs, limit, orderBy, 
  updateDoc, arrayUnion 
} from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { UserProfile, UserRole } from './types';
import { LogIn, GraduationCap, School as SchoolIcon, LayoutDashboard, BookOpen, Trophy, Plus, Send, Brain, ChevronRight, Trash2, LogOut, CheckCircle, Megaphone, Bell, MessageSquare, LifeBuoy, UserCheck, FolderOpen, AlertCircle, FileText, Download, Menu, X, User as UserIcon, Sparkles, Camera, Palette, Settings, Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, Users, Star, Play, Zap } from 'lucide-react';
import { SUBJECTS, RANKS } from './constants';
import { analyzeHomework, generateQuiz, analyzeTeacher } from './services/geminiService';
import { getRank } from './lib/rankUtils';
import { TeacherEvaluationsView } from './components/TeacherEvaluationsView';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setSchoolData(null);
      setLoadingProfile(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      if (snap.exists()) {
        const userData = snap.data() as UserProfile;
        setProfile(userData);
        
        if (userData.schoolCode) {
          const schoolSnap = await getDoc(doc(db, 'schools', userData.schoolCode));
          if (schoolSnap.exists()) {
            setSchoolData(schoolSnap.data());
          }
        }
      } else {
        setProfile(null);
      }
      setLoadingProfile(false);
    });

    return () => unsub();
  }, [user]);

  if (loading || loadingProfile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="serif text-xl tracking-widest text-brand-accent font-black">Them.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (!profile) {
    return <RoleSelection user={user} />;
  }

  if (!profile.schoolCode) {
    return <SchoolCodeEnrollment profile={profile} />;
  }

  return <MainApp profile={profile} schoolData={schoolData} />;
}

function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [teacherSubject, setTeacherSubject] = useState(SUBJECTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password, name);
        // Initialize profile for new user
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          role: role,
          points: 0,
          level: 1,
          badges: [],
          streak: 0,
          teacherSubject: role === 'teacher' ? teacherSubject : undefined,
          schoolId: 'school_1'
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white overflow-x-hidden selection:bg-brand-accent/30 selection:text-brand-accent">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-dark-bg/95 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/10 via-transparent to-dark-bg"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center max-w-4xl"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex justify-center mb-8"
          >
            <div className="w-20 h-1 bg-brand-accent/40 rounded-full shadow-[0_0_20px_rgba(10,63,122,0.5)]"></div>
          </motion.div>
          
          <h1 className="serif text-[12vw] sm:text-[10vw] md:text-9xl font-black italic tracking-tighter text-white mb-6 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] leading-none">
            Them<span className="text-brand-accent">.</span>
          </h1>
          
          <p className="text-lg sm:text-2xl md:text-3xl text-white/70 mb-8 sm:mb-16 font-light tracking-wide leading-relaxed max-w-2xl mx-auto serif italic">
            O simfonie academică asistată de inteligență artificială. 
            Ecosistemul unde performanța întâlnește prestigiul digital.
          </p>
          
          <div className="flex flex-col items-center gap-10">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAuthModalOpen(true)}
              className="group relative flex items-center gap-4 sm:gap-6 px-8 py-4 sm:px-16 sm:py-7 bg-white text-black font-black rounded-full uppercase tracking-[0.3em] text-xs transition-all duration-500 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">Începe Călătoria</span>
              <ArrowRight size={18} className="relative z-10 group-hover:text-white transition-colors duration-500" />
              <div className="absolute inset-0 bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </motion.button>
            
            <div className="flex flex-col items-center gap-2 opacity-40">
              <p className="text-[9px] uppercase tracking-[0.5em] text-white font-black">Acces Academic Securizat</p>
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-white to-transparent"></div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isAuthModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-[#0d0d0d] rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 p-6 sm:p-10 relative shadow-2xl"
              >
                <button 
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="mb-8">
                  <h2 className="serif text-4xl font-black italic text-white mb-2">
                    {authMode === 'login' ? 'Autentificare' : 'Înregistrare'}
                  </h2>
                  <p className="text-white/40 text-sm italic serif">
                    {authMode === 'login' ? 'Introdu datele pentru a intra în portal.' : 'Alătură-te elitei academice Them.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Nume Complet"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-accent transition-all placeholder:text-white/10"
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" size={18} />
                    <input 
                      type="email" 
                      placeholder="Email academic"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-accent transition-all placeholder:text-white/10"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" size={18} />
                    <input 
                      type="password" 
                      placeholder="Parolă"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-accent transition-all placeholder:text-white/10"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                      {(['student', 'teacher', 'director'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            role === r 
                              ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' 
                              : 'text-white/30 hover:text-white'
                          }`}
                        >
                          {r === 'student' ? 'Elev' : r === 'teacher' ? 'Profesor' : 'Director'}
                        </button>
                      ))}
                    </div>
                  )}

                  {authMode === 'signup' && role === 'teacher' && (
                    <div className="relative group">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" size={18} />
                      <select 
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer"
                      >
                        {SUBJECTS.map(s => (
                          <option key={s} value={s} className="bg-dark-bg text-white">{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs italic serif"
                    >
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full group relative overflow-hidden bg-white text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="relative z-10">{loading ? 'Se procesează...' : (authMode === 'login' ? 'Accesează Portalul' : 'Creează Cont')}</span>
                    <div className="absolute inset-0 bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                      setError(null);
                    }}
                    className="text-white/30 text-xs hover:text-brand-accent transition-colors underline decoration-white/10 underline-offset-4"
                  >
                    {authMode === 'login' ? 'Nu ai un cont? Înregistrează-te' : 'Ai deja un cont? Conectează-te'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-20"
        >
          <p className="text-[8px] uppercase tracking-[0.4em] font-black">Explorează</p>
          <div className="w-px h-12 bg-gradient-to-b from-white to-transparent"></div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-40 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Inovație Pedagogică</span>
                <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Standardul Viitorului<span className="text-brand-accent">.</span></h2>
              </div>
              <p className="text-xl text-white/40 leading-relaxed font-light italic serif max-w-xl">
                Them. nu este doar o platformă, ci un partener academic care utilizează tehnologia de vârf pentru a amplifica potențialul uman.
              </p>
              
              <div className="grid gap-10">
                <LandingFeatureItem 
                  icon={<Brain className="text-brand-accent" />}
                  title="Evaluare Spectrală"
                  desc="Lumi AI analizează lucrările studenților în milisecunde, oferind perspective critice și sugestii de îmbunătățire imediată."
                />
                <LandingFeatureItem 
                  icon={<Trophy className="text-brand-accent" />}
                  title="Meritocrație Digitală"
                  desc="Sistem de ranguri dinamice care recunoaște excelența și efortul susținut prin puncte de merit și distincții virtuale."
                />
                <LandingFeatureItem 
                  icon={<Sparkles className="text-brand-accent" />}
                  title="Audit Adaptiv"
                  desc="Platforma se calibrează la nivelul de pregătire al fiecărui elev, generând provocări academice personalizate."
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-20 bg-brand-accent/5 blur-[120px] rounded-full"></div>
              <div className="relative bg-card-bg border border-white/5 rounded-[2rem] sm:rounded-[80px] p-6 sm:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] rotate-1 sm:rotate-2 hover:rotate-0 transition-all duration-700">
                <div className="aspect-auto sm:aspect-[4/5] bg-black/40 rounded-[1.5rem] sm:rounded-[60px] p-6 sm:p-10 flex flex-col gap-6 sm:gap-10 border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-[8px] uppercase tracking-widest text-white/30 font-black">Lumi AI Visualizer v2.0</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="h-6 w-3/4 bg-white/5 rounded-full"></div>
                    <div className="h-4 w-1/2 bg-white/5 rounded-full opacity-50"></div>
                  </div>

                  <div className="flex-1 border border-dashed border-white/10 rounded-[40px] flex items-center justify-center overflow-hidden">
                    <div className="relative w-full h-full p-8 flex flex-col gap-8">
                       <div className="space-y-4">
                         <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-brand-accent">
                           <span>Acuratețe Academică</span>
                           <span>98.4%</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full w-[98.4%] bg-brand-accent shadow-[0_0_15px_rgba(10,63,122,0.5)]"></div>
                         </div>
                       </div>
                       
                       <div className="bg-brand-accent/5 p-6 rounded-[24px] border border-brand-accent/10 space-y-3 italic serif text-sm text-brand-accent/80">
                          "Analiza contextului literar relevă o profunzime semantică superioară standardului actual. Se recomandă explorarea nuanțelor pragmatice."
                       </div>

                       <div className="mt-auto flex justify-center">
                         <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-brand-accent animate-pulse">
                            <Sparkles size={32} />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-40 bg-zinc-950/50 relative border-y border-white/5">
        <div className="max-w-5xl mx-auto px-8 text-center space-y-16">
          <div className="flex justify-center">
            <div className="w-16 h-1 bg-white/10 rounded-full"></div>
          </div>
          <h2 className="serif text-5xl md:text-7xl italic text-white tracking-tighter leading-tight">
            "Educația nu este despre arhivarea informației, ci despre arhitectura gândirii."
          </h2>
          <p className="text-brand-accent text-[10px] uppercase font-black tracking-[0.8em]">Misiunea Noastră</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <h3 className="serif text-4xl italic font-black text-white">Them<span className="text-brand-accent">.</span></h3>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Ecosistem Academic Avansat</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-6">
            <div className="flex gap-10">
              <a href="#" className="text-[9px] uppercase tracking-widest text-white/30 hover:text-brand-accent transition-colors">Termeni</a>
              <a href="#" className="text-[9px] uppercase tracking-widest text-white/30 hover:text-brand-accent transition-colors">Privitate</a>
              <a href="#" className="text-[9px] uppercase tracking-widest text-white/30 hover:text-brand-accent transition-colors">Contact</a>
            </div>
            <p className="text-[10px] text-white/10 font-bold uppercase tracking-[0.2em]">
              © 2026 Vaida Roberto. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LandingFeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex gap-8 group">
      <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-brand-accent group-hover:text-white transition-all duration-500 shadow-xl">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="serif text-2xl italic text-white group-hover:text-brand-accent transition-colors">{title}</h4>
        <p className="text-white/30 leading-relaxed font-light text-sm italic serif">{desc}</p>
      </div>
    </div>
  );
}

function RoleSelection({ user }: { user: any }) {
  const [step, setStep] = useState<'role' | 'subject'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const selectRole = async (role: UserRole) => {
    if (role === 'teacher') {
      setSelectedRole(role);
      setStep('subject');
    } else {
      await saveProfile(role);
    }
  };

  const saveProfile = async (role: UserRole, subject?: string) => {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'User',
      role: role,
      points: 0,
      createdAt: new Date().toISOString(),
      ...(subject && { teacherSubject: subject })
    };
    await setDoc(doc(db, 'users', user.uid), newProfile);
  };

  if (step === 'subject' && selectedRole === 'teacher') {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-dark-bg p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full"
        >
          <div className="text-center mb-16 space-y-4">
             <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent">Catedra Academică</span>
             <h2 className="serif text-5xl md:text-7xl italic tracking-tight text-white">Ce materie vei preda?</h2>
             <div className="w-20 h-px bg-white/10 mx-auto mt-8"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {SUBJECTS.map((s, idx) => (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={s}
                onClick={() => saveProfile('teacher', s)}
                className="p-8 bg-card-bg border border-white/5 rounded-[32px] hover:border-brand-accent/40 hover:bg-brand-accent/5 transition-all serif italic text-2xl group relative overflow-hidden"
              >
                <span className="relative z-10 group-hover:text-brand-accent transition-colors">{s}</span>
                <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </motion.button>
            ))}
          </div>
          
          <div className="flex justify-center mt-20">
            <button 
              onClick={() => setStep('role')}
              className="group flex items-center gap-3 text-white/20 uppercase tracking-[0.3em] text-[10px] font-black hover:text-brand-accent transition-all"
            >
              <div className="w-8 h-px bg-current group-hover:w-12 transition-all"></div>
              Înapoi la selecție rol
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-dark-bg p-4 sm:p-8 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full space-y-10 sm:space-y-20 py-6 sm:py-12"
      >
        <div className="text-center space-y-4">
          <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent">Protocol de Acces</span>
          <h2 className="serif text-4xl sm:text-6xl md:text-8xl italic tracking-tighter text-white">Cine ești la Them<span className="text-brand-accent">.</span></h2>
          <p className="text-white/20 text-sm italic font-light tracking-widest">Alege-ți calea în ecosistemul nostru academic</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RoleCard 
            icon={<GraduationCap size={40} />}
            title="Sunt Elev"
            description="Navighează prin teme, obține perspective AI și urcă în ierarhia academică prin merit."
            onClick={() => selectRole('student')}
            delay={0.1}
          />
          <RoleCard 
            icon={<SchoolIcon size={40} />}
            title="Sunt Profesor"
            description="Edifică spații de învățare, ghidează elevii și utilizează Lumi AI ca asistent pedagogic."
            onClick={() => selectRole('teacher')}
            delay={0.2}
          />
          <RoleCard 
            icon={<UserCheck size={40} />}
            title="Sunt Director"
            description="Monitorizează prestigiul instituției și supervizează progresul global al comunității."
            onClick={() => saveProfile('director')}
            delay={0.3}
          />
        </div>
      </motion.div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick, delay }: { icon: any, title: string, description: string, onClick: () => void, delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -12, scale: 1.02 }}
      onClick={onClick}
      className="p-6 sm:p-10 lg:p-12 xl:p-16 bg-card-bg border border-white/5 rounded-[2rem] sm:rounded-[64px] text-left hover:border-brand-accent/20 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col gap-6 sm:gap-10 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all duration-500 shadow-xl">
        {icon}
      </div>
      <div className="space-y-4 relative z-10">
        <h3 className="serif text-2xl sm:text-4xl italic text-white group-hover:text-brand-accent transition-colors">{title}</h3>
        <p className="text-white/40 leading-relaxed font-light text-sm tracking-wide">{description}</p>
      </div>
      <div className="mt-auto flex items-center gap-3 text-brand-accent font-black uppercase text-[9px] tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
        Selectează Destinul <ChevronRight size={14} />
      </div>
    </motion.button>
  );
}

function SchoolCodeEnrollment({ profile }: { profile: UserProfile }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const joinSchool = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError('');

    try {
      const schoolDoc = await getDoc(doc(db, 'schools', code));
      if (!schoolDoc.exists()) {
        await setDoc(doc(db, 'schools', code), { name: `Institutul Academic ${code}`, code });
      }
      await setDoc(doc(db, 'users', profile.uid), { schoolCode: code }, { merge: true });
    } catch (err: any) {
      setError('Eroare la înregistrare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-dark-bg p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-card-bg border border-white/5 p-6 sm:p-12 rounded-[2rem] sm:rounded-[64px] shadow-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent"></div>
          
          <div className="flex flex-col items-center gap-8 mb-12">
            <div className="w-20 h-20 rounded-[28px] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shadow-xl">
              <SchoolIcon size={36} />
            </div>
            <div className="text-center space-y-3">
              <h2 className="serif text-4xl italic text-white">Acces Instituție</h2>
              <p className="text-white/30 text-xs font-light tracking-widest leading-relaxed">Introdu codul specific oferit de școala ta pentru a intra în portal.</p>
            </div>
          </div>
          
          <form onSubmit={joinSchool} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black tracking-[0.4em] opacity-20 ml-4">Cod Instituție</label>
              <input 
                type="text" 
                placeholder="Ex: CARAG-2023"
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-black/40 border border-white/10 rounded-3xl p-4 sm:p-6 font-mono tracking-[0.2em] text-center text-base sm:text-xl text-brand-accent focus:border-brand-accent focus:bg-brand-accent/5 outline-none transition-all placeholder:opacity-10"
              />
              {error && <p className="text-red-400 text-[10px] uppercase font-bold tracking-widest text-center mt-4 bg-red-400/5 py-2 rounded-lg">{error}</p>}
            </div>
            
            <button 
              disabled={loading || !code}
              className="w-full py-4 sm:py-6 bg-brand-accent text-black font-black rounded-3xl uppercase tracking-[0.3em] text-xs hover:bg-white hover:scale-[1.02] transition-all disabled:opacity-20 shadow-2xl shadow-brand-accent/20"
            >
              {loading ? 'Verificăm Acreditarea...' : 'Accesează Portalul'}
            </button>
          </form>
          
          <p className="text-[8px] uppercase tracking-[0.4em] text-white/10 text-center mt-12 font-bold leading-relaxed">
            Them. Encryption Protocol v4.0 Active
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function MainApp({ profile, schoolData }: { profile: UserProfile, schoolData?: any }) {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [view, setView] = useState<'dashboard' | 'homeworks' | 'classes' | 'quizzes' | 'rewards' | 'portfolio' | 'school' | 'ranking' | 'announcements' | 'tickets' | 'director' | 'resources' | 'profile' | 'evaluations'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const notificationsQuery = useMemo(() => query(
    collection(db, 'notifications'),
    where('userId', '==', profile.uid),
    orderBy('createdAt', 'desc'),
    limit(5)
  ), [profile.uid]);
  
  const [notifications] = useCollectionData(notificationsQuery, { idField: 'id' } as any);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  useEffect(() => {
    if (profile.role === 'teacher') {
      setView('classes');
      if (profile.teacherSubject) {
        setSelectedSubject(profile.teacherSubject);
      }
    } else if (profile.role === 'director') {
      setView('director');
    }
  }, [profile]);

  return (
    <div className="h-screen flex flex-col bg-dark-bg font-sans overflow-hidden">
      {/* Header */}
      <nav className="h-20 sm:h-24 border-b border-white/5 flex items-center justify-between px-4 sm:px-12 bg-dark-bg/80 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3 sm:gap-8">
          <button 
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-all active:scale-95 group"
            aria-label="Toggle Menu"
          >
            {isNavOpen ? <X size={18} /> : <Menu size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
          </button>
          
          <div className="h-10 w-px bg-white/5"></div>
          
          <button 
            onClick={() => { 
              if (profile.role === 'director') setView('director');
              else if (profile.role === 'teacher') setView('dashboard');
              else setView('dashboard');
              setIsNavOpen(false); 
            }}
            className="serif text-2xl sm:text-4xl font-black tracking-[-0.05em] italic hover:opacity-70 active:scale-95 transition-all text-white"
          >
            Them<span className="text-brand-accent">.</span>
          </button>
          
          <div className="h-10 w-px bg-white/5 hidden xl:block"></div>
          
          <div className="hidden xl:flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-black">Institutul Academic</span>
            <span className="text-xs font-light tracking-widest text-white/60">{schoolData?.name || profile.schoolCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-10">
          {profile.role === 'student' && (
            <div 
              onClick={() => { setView('profile'); setIsNavOpen(false); }} 
              className="flex items-center gap-2 sm:gap-5 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-full border border-white/5 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black leading-none mb-1">{getRank(profile.points).current.name}</span>
                <span className="text-xs sm:text-base font-black text-brand-accent leading-none tracking-tight">{profile.points.toLocaleString()} <span className="text-[10px] opacity-30 font-serif italic">Pts</span></span>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20 shadow-[0_0_20px_rgba(10,63,122,0.2)] shrink-0">
                <UserIcon size={16} />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/30 hover:text-brand-accent hover:border-brand-accent/20 transition-all relative group"
              >
                <Bell size={16} className="group-hover:animate-swing" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-brand-accent rounded-full border-4 border-dark-bg"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute top-full right-0 mt-6 w-96 bg-[#0F0F12] border border-white/10 rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-[60] overflow-hidden backdrop-blur-2xl"
                  >
                    <div className="p-8 border-b border-white/5 flex justify-between items-end">
                      <div>
                        <h4 className="serif text-2xl italic text-white leading-none">Arhiva Notificări</h4>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black mt-2">Ultimele actualizări Lumi AI</p>
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={async () => {
                            const unread = notifications?.filter(n => !n.read) || [];
                            for (const n of unread) {
                              await updateDoc(doc(db, 'notifications', n.id), { read: true });
                            }
                          }}
                          className="text-[9px] uppercase font-black tracking-widest text-brand-accent hover:text-white transition-colors"
                        >
                          Arhivează tot
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications?.length === 0 ? (
                        <div className="p-16 text-center">
                          <Bell size={32} className="mx-auto text-white/5 mb-4" />
                          <p className="text-xs text-white/20 italic">Liniște academică deplină</p>
                        </div>
                      ) : (
                        notifications?.map((n: any) => (
                          <div key={n.id} className={`p-8 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors relative ${!n.read ? 'bg-brand-accent/5' : ''}`}>
                            {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent"></div>}
                            <p className="text-sm font-bold text-white/80 mb-2">{n.title}</p>
                            <p className="text-xs text-white/40 leading-relaxed font-light">{n.message}</p>
                            <div className="flex justify-between items-center mt-4">
                               <p className="text-[9px] text-white/10 font-mono tracking-widest">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               <span className="text-[8px] uppercase tracking-widest text-brand-accent/30 font-black italic">System Message</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => auth.signOut()} 
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/30 hover:text-red-400 hover:border-red-400/20 transition-all group"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toggleable Sidebar Overlay */}
        <AnimatePresence>
          {isNavOpen && (
            <>
              <motion.div 
                key="nav-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNavOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.aside 
                key="nav-sidebar"
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-0 left-0 bottom-0 w-80 bg-[#0D0D10] border-r border-white/5 z-[45] flex flex-col shadow-[20px_0_40px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                <div className="p-8 flex flex-col gap-10 overflow-y-auto h-full scrollbar-hide">
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30 mb-6 font-bold">Navigație</h3>
                    <ul className="space-y-2">
                      {profile.role === 'teacher' && (
                        <React.Fragment key="teacher-nav">
                          <NavButton key="dashboard-t" active={view === 'dashboard'} icon={<LayoutDashboard size={18} />} label="Tablou General" onClick={() => { setView('dashboard'); setIsNavOpen(false); }} />
                          <NavButton key="classes-t" active={view === 'classes'} icon={<SchoolIcon size={18} />} label="Clasele Mele" onClick={() => { setView('classes'); setIsNavOpen(false); }} />
                        </React.Fragment>
                      )}
                      
                      {profile.role === 'student' && (
                        <React.Fragment key="student-nav">
                           <NavButton key="dashboard-s" active={view === 'dashboard'} icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => { setView('dashboard'); setIsNavOpen(false); }} />
                          <NavButton key="hw-s" active={view === 'homeworks'} icon={<BookOpen size={18} />} label="Teme & Materiale" onClick={() => { setView('homeworks'); setIsNavOpen(false); }} />
                          <NavButton key="classes-s" active={view === 'classes'} icon={<SchoolIcon size={18} />} label="Participare Clase" onClick={() => { setView('classes'); setIsNavOpen(false); }} />
                          <NavButton key="portfolio-s" active={view === 'portfolio'} icon={<LayoutDashboard size={18} />} label="Portofoliul Meu" onClick={() => { setView('portfolio'); setIsNavOpen(false); }} />
                          <NavButton key="quizzes-s" active={view === 'quizzes'} icon={<Brain size={18} />} label="AI Quizzes" onClick={() => { setView('quizzes'); setIsNavOpen(false); }} />
                          <NavButton key="rewards-s" active={view === 'rewards'} icon={<Trophy size={18} />} label="Recompense" onClick={() => { setView('rewards'); setIsNavOpen(false); }} />
                        </React.Fragment>
                      )}

                      {profile.role === 'director' && (
                        <React.Fragment key="director-nav">
                          <NavButton key="director-d" active={view === 'director'} icon={<LayoutDashboard size={18} />} label="Panou Director" onClick={() => { setView('director'); setIsNavOpen(false); }} />
                          <NavButton key="school-d" active={view === 'school'} icon={<SchoolIcon size={18} />} label="Toate Clasele" onClick={() => { setView('school'); setIsNavOpen(false); }} />
                        </React.Fragment>
                      )}

                      <NavButton key="ranking-all" active={view === 'ranking'} icon={<Trophy size={18} className="text-yellow-500" />} label="Top Academic" onClick={() => { setView('ranking'); setIsNavOpen(false); }} />
                      <NavButton key="resources-all" active={view === 'resources'} icon={<FolderOpen size={18} />} label="Resurse Studiu" onClick={() => { setView('resources'); setIsNavOpen(false); }} />
                      <NavButton key="announcements-all" active={view === 'announcements'} icon={<Bell size={18} />} label="Anunțuri" onClick={() => { setView('announcements'); setIsNavOpen(false); }} />
                      <NavButton key="tickets-all" active={view === 'tickets'} icon={<LifeBuoy size={18} />} label="Asistență" onClick={() => { setView('tickets'); setIsNavOpen(false); }} />
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30 mb-6 font-bold">
                      {profile.role === 'teacher' ? 'Materia Ta' : 'Materiile de Studiu'}
                    </h3>
                    <ul className="space-y-1">
                      {SUBJECTS.filter(s => {
                        if (profile.role === 'teacher' && profile.teacherSubject) {
                          return s === profile.teacherSubject;
                        }
                        if (profile.role === 'teacher' && !profile.teacherSubject) return false; // Hide all if no subject set
                        return true;
                      }).map((sub) => (
                        <SubjectButton 
                          key={sub} 
                          label={sub} 
                          active={selectedSubject === sub && view === 'homeworks'} 
                          onClick={() => { setSelectedSubject(sub); setView('homeworks'); setIsNavOpen(false); }} 
                        />
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-auto p-8 border-t border-white/5 bg-black/20">
                  {profile.role === 'student' ? (
                    <div className="bg-brand-accent/5 rounded-2xl p-5 border border-brand-accent/10">
                      <h4 className="text-[10px] uppercase tracking-widest text-brand-accent mb-3 font-bold">Nivel Elev</h4>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(profile.points % 1000) / 10}%` }}
                          className="h-full bg-brand-accent shadow-[0_0_10px_rgba(151,192,238,0.5)]"
                        />
                      </div>
                      <p className="text-[10px] opacity-40 font-medium tracking-tight">Următorul rang la {Math.ceil((profile.points + 1) / 1000) * 1000} puncte</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                      <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-3 font-bold">Status Profesor</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Activ în Sistem</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content Section */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 bg-dark-bg custom-scrollbar transition-all duration-300 ${isNavOpen ? 'opacity-30 pointer-events-none filter blur-sm translate-x-12' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={view + selectedSubject}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && profile.role === 'student' && <DashboardView profile={profile} setView={setView} />}
              {view === 'dashboard' && profile.role === 'teacher' && <TeacherDashboardView profile={profile} setView={setView} />}
              {view === 'homeworks' && <HomeworkView profile={profile} subject={selectedSubject} />}
              {view === 'classes' && (profile.role === 'teacher' ? <TeacherClassesView profile={profile} /> : <StudentClassesView profile={profile} />)}
              {view === 'portfolio' && <PortfolioView profile={profile} />}
              {view === 'quizzes' && <QuizView profile={profile} subject={selectedSubject} setView={setView} />}
              {view === 'rewards' && <RewardsView profile={profile} />}
              {view === 'school' && (profile.role === 'teacher' || profile.role === 'director') && <SchoolActivityView profile={profile} schoolData={schoolData} />}
              {view === 'ranking' && <RankingView profile={profile} />}
              {view === 'announcements' && <AnnouncementsView profile={profile} />}
              {view === 'tickets' && <TicketsView profile={profile} />}
              {view === 'director' && <DirectorDashboard profile={profile} schoolData={schoolData} />}
              {view === 'resources' && <ResourcesView profile={profile} />}
              {view === 'profile' && <ProfileDetailsView profile={profile} />}
              {view === 'evaluations' && <TeacherEvaluationsView profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all ${
        active ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-sm font-medium tracking-wide">{label}</span>
      {active && <motion.div layoutId="nav-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-accent" />}
    </button>
  );
}

function SubjectButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group relative overflow-hidden ${
        active ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/30' : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`text-sm tracking-wide transition-all ${active ? 'font-black italic serif' : 'font-light'}`}>{label}</span>
      {active ? (
        <Sparkles size={14} className="animate-pulse" />
      ) : (
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
      )}
    </button>
  );
}

function TeacherDashboardView({ profile, setView }: { profile: UserProfile, setView: (v: any) => void }) {
  const qClasses = useMemo(() => query(collection(db, 'classes'), where('teacherId', '==', profile.uid)), [profile.uid]);
  const [classes, loadingClasses] = useCollectionData(qClasses, { idField: 'id' } as any);

  const qSubs = useMemo(() => query(collection(db, 'submissions'), where('subject', '==', profile.teacherSubject || ''), where('schoolCode', '==', profile.schoolCode), limit(20)), [profile.teacherSubject, profile.schoolCode]);
  const [submissions, loadingSubs] = useCollectionData(qSubs, { idField: 'id' } as any);

  const pendingCount = useMemo(() => submissions?.filter((s: any) => s.status !== 'graded').length || 0, [submissions]);

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l-4 border-brand-accent/40 pl-10 py-2">
        <div>
          <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent mb-3 block">Consolă Profesor</span>
          <h2 className="serif text-5xl md:text-7xl italic tracking-tighter text-white leading-none">Salut, {profile.name}</h2>
        </div>
        <div className="text-right">
           <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.2em] italic mb-1">Materia Ta: {profile.teacherSubject || 'Nespecificată'}</p>
           <p className="text-white/10 text-[8px] uppercase tracking-[0.4em] font-bold italic">Sistem Academic Lumi v3.4</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <DashboardStatsCard 
          label="Clase Coordonate" 
          value={classes?.length || 0} 
          icon={<SchoolIcon size={20} />}
          color="accent"
        />
        <DashboardStatsCard 
          label="Evaluări în Așteptare" 
          value={pendingCount} 
          icon={<Brain size={20} />}
          color={pendingCount > 0 ? 'accent' : ''}
          onClick={() => setView('evaluations')}
        />
        <DashboardStatsCard 
          label="Total Studenți Înrolați" 
          value={classes?.reduce((acc: number, c: any) => acc + (c.studentIds?.length || 0), 0) || 0} 
          icon={<Users size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
             <h3 className="serif text-3xl italic text-white flex items-center gap-4">
                <LayoutDashboard size={24} className="text-brand-accent" /> Activitate Recentă Clase
             </h3>
             <button onClick={() => setView('classes')} className="text-[9px] uppercase font-black tracking-widest text-brand-accent hover:text-white transition-all">Vezi Toate Clasele</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loadingClasses && <div className="col-span-full py-12 text-center text-brand-accent animate-pulse serif italic">Se accesează registrul claselor...</div>}
            {!loadingClasses && classes?.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[48px] bg-black/20">
                <p className="serif text-xl italic text-white/20">Nu ai nicio clasă creată încă.</p>
              </div>
            )}
            {classes?.slice(0, 4).map((c: any) => (
              <div key={c.id} onClick={() => setView('classes')} className="bg-card-bg border border-white/5 p-8 rounded-[48px] hover:border-brand-accent/30 transition-all cursor-pointer group">
                <span className="text-[8px] uppercase tracking-widest text-brand-accent/60 block mb-2">{c.subject}</span>
                <h4 className="serif text-2xl italic text-white mb-4 group-hover:translate-x-2 transition-transform">{c.name}</h4>
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-white/20">
                  <span>{c.studentIds?.length || 0} Studenți</span>
                  <span>{c.joinCode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <h3 className="serif text-3xl italic text-white">Acțiuni Rapide</h3>
          <div className="grid grid-cols-1 gap-6">
             <button onClick={() => setView('classes')} className="p-8 bg-brand-accent/5 border border-brand-accent/10 rounded-[40px] flex items-center gap-6 hover:bg-brand-accent/10 transition-all group">
                <div className="w-12 h-12 bg-brand-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20 group-hover:scale-110 transition-transform">
                   <Plus size={20} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] uppercase font-black tracking-widest text-brand-accent italic leading-none mb-1">Configurare</p>
                   <p className="text-sm font-bold text-white">Crează Clasă Nouă</p>
                </div>
             </button>
             <button onClick={() => setView('announcements')} className="p-8 bg-white/5 border border-white/5 rounded-[40px] flex items-center gap-6 hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Megaphone size={20} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] uppercase font-black tracking-widest text-white/20 leading-none mb-1">Comunicare</p>
                   <p className="text-sm font-bold text-white">Publică Anunț</p>
                </div>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ profile, setView }: { profile: UserProfile, setView: (v: any) => void }) {
  // Student queries
  const subQuery = useMemo(() => {
    if (profile.role !== 'student') return null;
    return query(collection(db, 'submissions'), where('studentId', '==', profile.uid));
  }, [profile.role, profile.uid]);
  const [studentSubmissions, loadingStudent] = useCollectionData(subQuery, { idField: 'id' } as any);

  const submissions = studentSubmissions;
  const loading = loadingStudent;

  const subjectStats = React.useMemo(() => {
    if (!studentSubmissions) return [];
    const stats: Record<string, number> = {};
    studentSubmissions.forEach((sub: any) => {
      stats[sub.subject] = (stats[sub.subject] || 0) + (sub.pointsAwarded || 0);
    });
    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [studentSubmissions]);

  const [selectedDays, setSelectedDays] = useState(30);

  const chartData = React.useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return [
        { date: 'Start', points: 0 },
        { date: 'Curent', points: profile.points }
      ];
    }
    
    // Filtrare după perioadă
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);

    const sortedSubs = [...submissions]
      .filter(s => new Date(s.createdAt).getTime() > cutoffDate.getTime())
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    if (sortedSubs.length === 0) {
      return [
        { date: 'Perioadă Vidă', points: profile.points },
      ];
    }

    let cumulativePoints = profile.points - sortedSubs.reduce((acc, s) => acc + (s.pointsAwarded || 0), 0);
    return sortedSubs.map(sub => {
      cumulativePoints += sub.pointsAwarded || 0;
      return {
        date: new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        points: cumulativePoints
      };
    });
  }, [submissions, profile.points, selectedDays]);

  const rankInfo = React.useMemo(() => getRank(profile.points), [profile.points]);

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 border-l-2 sm:border-l-4 border-brand-accent/40 pl-4 sm:pl-10 py-2">
        <div>
          <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent mb-3 block">Panou Academic Personal</span>
          <h2 className="serif text-3xl sm:text-5xl md:text-7xl italic tracking-tighter text-white leading-none">Salut, {profile.name}</h2>
        </div>
        <p className="text-white/20 text-xs font-light tracking-[0.2em] italic max-w-xs text-left md:text-right uppercase">Analiza detaliată a parcursului academic și a meritului personal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
        <DashboardStatsCard 
          label="Puncte Merit Totale" 
          value={profile.points.toLocaleString()} 
          suffix="PTS"
          icon={<Trophy size={20} />}
          color="accent"
        />
        <DashboardStatsCard 
          label="Lucrări Evaluate" 
          value={studentSubmissions?.length || 0} 
          icon={<BookOpen size={20} />}
        />
        <div className="bg-card-bg border border-white/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[64px] flex flex-col gap-6 sm:gap-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={120} />
          </div>
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">Rang Academic Curent</span>
            <p className="serif text-3xl sm:text-5xl md:text-6xl italic text-white leading-none tracking-tighter" style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</p>
          </div>
          <div className="space-y-4 mt-auto relative z-10">
            <div className="flex justify-between items-end text-[9px] uppercase font-black tracking-widest leading-none">
              <span className="opacity-30">Evoluție Rang</span>
              <span className="text-brand-accent">{rankInfo.next ? `${rankInfo.next.minPoints - profile.points} pts până la ${rankInfo.next.name}` : 'Apege Academic'}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${rankInfo.progress}%` }}
                 transition={{ duration: 1.5, ease: "circOut" }}
                 className="h-full bg-brand-accent rounded-full shadow-[0_0_15px_rgba(10,63,122,0.6)]"
               />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-card-bg border border-white/5 p-6 sm:p-12 rounded-[2rem] sm:rounded-[64px] shadow-[0_30px_100px_rgba(0,0,0,0.5)] space-y-6 sm:space-y-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="serif text-3xl italic text-white">Analiza de Progres</h3>
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/30 font-black mt-2">Acumularea punctelor în intervalul temporal</p>
            </div>
            <div className="flex gap-4">
               {[7, 14, 30, 90].map(d => (
                 <button 
                   key={d} 
                   onClick={() => setSelectedDays(d)}
                   className={`text-[8px] uppercase font-black tracking-widest px-4 py-2 rounded-full border transition-all ${selectedDays === d ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent shadow-[0_0_20px_rgba(10,63,122,0.2)]' : 'bg-white/5 border-white/5 text-white/20 hover:text-white'}`}
                 >
                   {d}D
                 </button>
               ))}
            </div>
          </div>
          
          <div className="h-72 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A3F7A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0A3F7A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" stroke="#ffffff03" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff10" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#ffffff20' }}
                  dy={10}
                />
                <YAxis hide domain={['dataMin', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F0F12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#0A3F7A', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}
                  labelStyle={{ display: 'none' }}
                  cursor={{ stroke: '#0A3F7A', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#0A3F7A" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorPoints)" 
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#0F0F12] border border-white/5 p-6 sm:p-12 rounded-[2rem] sm:rounded-[64px] shadow-2xl flex flex-col gap-6 sm:gap-10">
           <div className="space-y-2">
             <h3 className="serif text-3xl italic text-white">Top Discipline</h3>
             <p className="text-[9px] uppercase tracking-[0.4em] text-white/30 font-black">Distribuția excelenței pe materii</p>
           </div>
           
           <div className="space-y-8 flex-1 flex flex-col justify-center">
              {subjectStats.length === 0 ? (
                <div className="text-center space-y-4 opacity-20 py-12">
                  <div className="w-12 h-12 rounded-full border border-dashed border-white mx-auto flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest italic">Nicio activitate înregistrată</p>
                </div>
              ) : (
                subjectStats.map(([sub, pts], idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={sub} 
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                         <span className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-1">{sub}</span>
                         <span className="serif text-2xl italic text-white leading-none whitespace-nowrap">{sub}</span>
                       </div>
                       <span className="text-brand-accent font-black text-xl italic serif leading-none">{pts} <span className="text-[8px] not-italic opacity-30 font-sans tracking-tight">PTS</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${(pts / profile.points) * 100}%` }}
                         transition={{ duration: 2, delay: idx * 0.2 }}
                         className="h-full bg-brand-accent/60 rounded-full" 
                       />
                    </div>
                  </motion.div>
                ))
              )}
           </div>

           <div className="pt-6 border-t border-white/5">
              <button 
                onClick={() => setView('portfolio')}
                className="w-full py-4 text-[9px] uppercase font-black tracking-[0.4em] text-white/30 hover:text-brand-accent hover:bg-brand-accent/5 rounded-2xl transition-all"
              >
                Vezi tot Portofoliul
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function DashboardStatsCard({ label, value, suffix, icon, color, onClick }: { label: string, value: string | number, suffix?: string, icon: any, color?: string, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-card-bg border border-white/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[64px] flex flex-col gap-6 sm:gap-10 shadow-2xl group hover:border-white/10 transition-all duration-500 relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-brand-accent/30' : ''}`}>
      <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-500 shadow-xl ${color === 'accent' ? 'bg-brand-accent text-white shadow-brand-accent/20' : 'bg-white/5 text-white/40 group-hover:text-white group-hover:border-white/20'}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black leading-none block mb-2">{label}</span>
        <p className={`serif text-3xl sm:text-5xl md:text-6xl italic leading-none tracking-tighter ${color === 'accent' ? 'text-brand-accent' : 'text-white'}`}>
          {value} {suffix && <span className="text-sm not-italic opacity-20 font-sans tracking-normal uppercase ml-1">{suffix}</span>}
        </p>
      </div>
      {color === 'accent' && (
        <div className="mt-auto flex items-center gap-3 text-green-400 text-[9px] uppercase font-black tracking-[0.3em] italic">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
          Status: Excelent
        </div>
      )}
      {!color && (
        <div className="mt-auto flex items-center gap-3 text-white/20 text-[9px] uppercase font-black tracking-[0.3em]">
          <BookOpen size={12} className="opacity-50" />
          Arhivă Activă
        </div>
      )}
    </div>
  );
}

function HomeworkView({ profile, subject }: { profile: UserProfile, subject: string }) {
  const hwQuery = useMemo(() => query(collection(db, 'homeworks'), where('subject', '==', subject), where('schoolCode', '==', profile.schoolCode)), [subject, profile.schoolCode]);
  const publicSubQuery = useMemo(() => query(collection(db, 'submissions'), where('subject', '==', subject), where('schoolCode', '==', profile.schoolCode), where('isPublic', '==', true)), [subject, profile.schoolCode]);
  
  const [homeworks, loadingHw] = useCollectionData(hwQuery, { idField: 'id' } as any);
  const [publicSubs, loadingPub] = useCollectionData(publicSubQuery, { idField: 'id' } as any);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isIndependent, setIsIndependent] = useState(false);
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [selectedPub, setSelectedPub] = useState<any>(null);

  if (loadingHw || loadingPub) return (
    <div className="h-[40vh] flex flex-col items-center justify-center gap-6">
      <BookOpen size={48} className="text-brand-accent animate-pulse" />
      <p className="serif text-2xl italic text-white/40">Se compilează arhiva academică...</p>
    </div>
  );

  if (selectedHw) {
    return <HomeworkDetail homework={selectedHw} profile={profile} onBack={() => setSelectedHw(null)} />;
  }

  if (selectedPub) {
    // Adăptăm submisia publică pentru a fi vizualizată ca o temă
    const adaptedHw = {
      ...selectedPub,
      description: selectedPub.requirement,
      isPublicSubmission: true
    };
    return <HomeworkDetail homework={adaptedHw} profile={profile} onBack={() => setSelectedPub(null)} />;
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10 py-2">
        <div>
          <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent mb-3 block">Programă Academică</span>
          <h2 className="serif text-6xl md:text-8xl italic tracking-tighter text-white">{subject}</h2>
        </div>
        <div className="flex gap-4">
          {profile.role === 'student' && (
            <button 
              onClick={() => setIsIndependent(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white/60 font-black rounded-full uppercase tracking-widest text-[9px] hover:bg-brand-accent hover:text-white hover:border-brand-accent/20 transition-all shadow-xl group"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Încarcă Temă Independentă
            </button>
          )}
        </div>
      </div>

      <div className="space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4 opacity-30">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-[10px] uppercase font-black tracking-[0.3em]">Teme Atribuite de Profesori</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {homeworks?.length === 0 && (
              <div key="empty-official-hw" className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-10">
                <p className="serif text-xl italic">Nicio temă oficială.</p>
              </div>
            )}
            {homeworks?.map((hw: any, idx: number) => (
              <HomeworkCard key={hw.id} homework={hw} idx={idx} onClick={() => setSelectedHw(hw)} />
            ))}
          </div>
        </div>

        {publicSubs && publicSubs.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 opacity-30">
              <div className="w-8 h-px bg-brand-accent"></div>
              <span className="text-[10px] uppercase font-black tracking-[0.3em] text-brand-accent">Resurse & Teme Comunitate</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publicSubs.map((sub: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={sub.id} 
                  onClick={() => setSelectedPub(sub)}
                  className="bg-card-bg border border-white/5 p-8 rounded-[48px] hover:border-brand-accent/20 transition-all group cursor-pointer shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <UserIcon size={60} />
                  </div>
                  <div className="space-y-4">
                     <span className="text-[9px] uppercase font-black tracking-widest text-brand-accent italic">Publicat de {sub.studentName}</span>
                     <h4 className="serif text-3xl italic text-white group-hover:text-brand-accent transition-colors">{sub.title}</h4>
                     <p className="text-white/30 text-sm line-clamp-2 italic serif">{sub.requirement}</p>
                     <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-brand-accent">
                          <CheckCircle size={14} />
                        </div>
                        <span className="text-[8px] uppercase font-black tracking-widest opacity-20 italic">Evaluat de Lumi AI</span>
                     </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAdding && <AddHomeworkModal subject={subject} schoolCode={profile.schoolCode!} userId={profile.uid} onClose={() => setIsAdding(false)} />}
      {isIndependent && <IndependentUploadModal subject={subject} profile={profile} onClose={() => setIsIndependent(false)} />}
    </div>
  );
}

function IndependentUploadModal({ subject, profile, onClose }: { subject: string, profile: UserProfile, onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [content, setContent] = useState('');
  const [isCode, setIsCode] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Imaginea este prea mare (max 2MB)");
        return;
      }
      setImageMime(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadWork = async () => {
    if (!title || !requirement || (!content && !selectedImage)) return;
    setSubmitting(true);
    try {
      const aiReport = { suggestedPoints: 0, analysis: "În așteptarea revizuirii profesorului.", difficulty: "N/A", hasErrors: false };
      const points = aiReport.suggestedPoints || 5;
      const submissionData = {
        studentId: profile.uid,
        studentName: profile.name,
        schoolCode: profile.schoolCode,
        content,
        imageUrl: selectedImage,
        requirement,
        title,
        subject,
        aiFeedback: aiReport.analysis,
        aiMeta: {
          difficulty: aiReport.difficulty,
          hasErrors: aiReport.hasErrors
        },
        isCode,
        isPublic,
        createdAt: new Date().toISOString(),
        pointsAwarded: 0,
        status: 'pending'
      };
      await addDoc(collection(db, 'submissions'), submissionData);
      const teachers = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'), where('teacherSubject', '==', subject), where('schoolCode', '==', profile.schoolCode)));
      teachers.docs.forEach(async (teacherDoc) => {
           await addDoc(collection(db, 'notifications'), {
              userId: teacherDoc.id,
              message: `Studentul ${profile.name} a încărcat o temă nouă la ${subject}: ${title}`,
              read: false,
              createdAt: new Date().toISOString()
           });
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Eroare la analiza temei. Încercați din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card-bg border border-white/10 p-12 rounded-[40px] max-w-5xl w-full shadow-2xl relative custom-scrollbar my-auto"
      >
        <button onClick={onClose} className="absolute top-10 right-10 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all">
          <X size={24} />
        </button>

        <h3 className="serif text-5xl mb-10 italic text-brand-accent tracking-tight underline underline-offset-8">Studiu Independent: {subject}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Denumirea Lucrării</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Rezolvare probleme optică"
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Cerința / Task-ul</label>
              <textarea 
                value={requirement} 
                onChange={e => setRequirement(e.target.value)}
                placeholder="Introdu cerința temei tale aici..."
                className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10 resize-none"
              />
            </div>
            
            <div className="space-y-2">
               <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Suport Vizual (Opțional)</label>
               <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 group"
               >
                  {selectedImage ? (
                    <div className="flex items-center gap-2 text-brand-accent">
                      <Camera size={16} />
                      <span className="text-[10px] uppercase font-black tracking-widest">Imagine Încărcată</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={24} className="text-white/20 group-hover:text-brand-accent transition-colors" />
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Poză cerință sau rezolvare</span>
                    </>
                  )}
               </button>
               {selectedImage && (
                 <div className="relative aspect-video rounded-xl border border-white/5 overflow-hidden bg-black/40">
                   <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-2" />
                   <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center shadow-lg"
                   >
                     <X size={14} />
                   </button>
                 </div>
               )}
            </div>

            <div className="flex items-center gap-8">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
                <button 
                  onClick={() => setIsCode(false)}
                  className={`px-6 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${!isCode ? 'bg-brand-accent text-black' : 'text-white/30'}`}
                >
                  Text
                </button>
                <button 
                  onClick={() => setIsCode(true)}
                  className={`px-6 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${isCode ? 'bg-brand-accent text-black' : 'text-white/30'}`}
                >
                  Cod
                </button>
              </div>

              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsPublic(!isPublic)}
                   className={`w-12 h-6 rounded-full relative transition-all duration-500 border ${isPublic ? 'bg-brand-accent border-brand-accent' : 'bg-white/5 border-white/10'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 ${isPublic ? 'left-7 shadow-[0_0_10px_white]' : 'left-1 opacity-20'}`}></div>
                 </button>
                 <span className={`text-[9px] uppercase font-black tracking-widest transition-colors ${isPublic ? 'text-brand-accent' : 'text-white/20'}`}>
                   {isPublic ? 'Public pe Platformă' : 'Postare Privată'}
                 </span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Conținutul Lucrării</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              placeholder="Scrie sau lipește rezolvarea aici..."
              className="w-full h-[500px] bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10 resize-none font-mono text-xs custom-scrollbar"
            />
          </div>
        </div>
        <div className="flex gap-6 pt-10">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all">Anulează</button>
          <button 
            disabled={submitting || !title || (!content && !selectedImage) || !requirement}
            onClick={uploadWork} 
            className="flex-[2] py-4 bg-brand-accent text-black font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all shadow-xl shadow-brand-accent/10 disabled:opacity-50"
          >
            {submitting ? 'Lumi AI Analizează...' : 'Analizează și Încarcă'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PortfolioView({ profile }: { profile: UserProfile }) {
  const q = useMemo(() => query(collection(db, 'submissions'), where('studentId', '==', profile.uid)), [profile.uid]);
  const [rawSubmissions, loading] = useCollectionData(q, { idField: 'id' } as any);
  
  const submissions = useMemo(() => {
    if (!rawSubmissions) return undefined;
    return [...rawSubmissions].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [rawSubmissions]);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  if (selectedSub) {
    return (
      <div className="space-y-12 pb-24 max-w-5xl mx-auto">
        <button onClick={() => setSelectedSub(null)} className="flex items-center gap-3 text-white/30 hover:text-brand-accent font-bold uppercase text-[9px] tracking-[0.2em] transition-all">
          <ChevronRight size={14} className="rotate-180" /> Înapoi la Portofoliu
        </button>

        <div className="space-y-8">
          <div className="flex flex-col gap-4 border-l border-brand-accent/20 pl-10">
            <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-brand-accent/50">{selectedSub.subject}</span>
            <h2 className="serif text-5xl italic leading-none">{selectedSub.title || "Lucrare"}</h2>
            <p className="text-white/40 italic font-light">{selectedSub.requirement}</p>
          </div>

          <div className="bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent border border-brand-accent/15 rounded-[48px] p-12 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-accent/5 rounded-full blur-[80px]"></div>
            <div className="flex items-center gap-6 mb-12">
              <div className="w-14 h-14 rounded-[18px] bg-brand-accent flex items-center justify-center text-black shadow-2xl shadow-brand-accent/40 shrink-0">
                <Brain size={28} />
              </div>
              <div className="flex-1">
                <h3 className="serif text-4xl italic">Feedback {selectedSub.status === 'graded' ? 'Academic' : 'Lumi AI'}</h3>
                <div className="flex gap-4 mt-2">
                   <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">Acțiune realizată la {new Date(selectedSub.createdAt).toLocaleDateString()}</p>
                   {selectedSub.aiMeta && (
                     <div className="flex gap-2">
                        <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${selectedSub.aiMeta.difficulty === 'High' ? 'bg-red-400/10 text-red-400' : 'bg-brand-accent/10 text-brand-accent'}`}>Dificultate: {selectedSub.aiMeta.difficulty}</span>
                        {selectedSub.aiMeta.hasErrors && <span className="bg-orange-400/10 text-orange-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Erori Găsite</span>}
                     </div>
                   )}
                </div>
              </div>
              <div className="bg-brand-accent/10 px-6 py-3 rounded-2xl border border-brand-accent/20">
                 <span className="text-3xl font-black italic serif text-brand-accent">+{selectedSub.pointsAwarded} <span className="text-[10px] uppercase not-italic tracking-tighter opacity-50">Pts</span></span>
              </div>
            </div>
            <div className="bg-black/20 p-8 rounded-3xl border border-white/5 custom-scrollbar max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-base opacity-90 leading-relaxed">
                {selectedSub.aiFeedback}
              </pre>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="serif text-2xl italic opacity-30 px-2">Conținutul Lucrării</h3>
            <div className="bg-card-bg border border-white/5 rounded-[32px] p-10 shadow-xl overflow-hidden space-y-8">
              {selectedSub.imageUrl && (
                <div className="w-full bg-black/40 rounded-2xl border border-white/5 overflow-hidden p-6">
                   <p className="text-[9px] uppercase font-black tracking-widest opacity-30 mb-4 ml-2">Imagine Înregistrată</p>
                   <img src={selectedSub.imageUrl} alt="My Work" className="w-auto max-h-[600px] mx-auto rounded-xl shadow-2xl" />
                </div>
              )}
              <div>
                <p className="text-[9px] uppercase font-black tracking-widest opacity-30 mb-4 ml-2">Text / Cod</p>
                <pre className="text-xs font-mono text-white/40 leading-relaxed overflow-x-auto custom-scrollbar">
                  {selectedSub.content || "Fără conținut text."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="serif text-6xl mb-3 italic tracking-tight underline underline-offset-[12px] decoration-brand-accent/20">Portofoliul Meu</h2>
        <p className="text-white/40 font-light tracking-widest uppercase text-xs">Arhiva ta personală de excelență academică</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {submissions?.length === 0 ? (
          <div key="empty-portfolio" className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[60px]">
            <LayoutDashboard size={48} className="mx-auto text-white/5 mb-6" />
            <p className="text-white/20 italic font-light">Nu ai încă nicio lucrare înregistrată în portofoliu.</p>
          </div>
        ) : (
          submissions?.map((sub: any) => (
            <motion.div 
              key={sub.id}
              whileHover={{ y: -8 }}
              onClick={() => setSelectedSub(sub)}
              className="bg-card-bg border border-white/5 p-8 rounded-[40px] flex flex-col gap-6 hover:border-brand-accent/20 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-bold uppercase py-1 px-3 bg-brand-accent/5 text-brand-accent tracking-widest border border-brand-accent/10 rounded-full">{sub.subject}</span>
                <span className="text-[10px] opacity-20 italic font-medium">{new Date(sub.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="serif text-3xl group-hover:text-brand-accent transition-colors leading-tight line-clamp-2">{sub.title || "Lucrare Independentă"}</h4>
              <p className="text-xs text-white/30 leading-relaxed font-light line-clamp-3 italic opacity-50">"{sub.requirement || "Temă de curs"}"</p>
              <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-brand-accent opacity-50" />
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 text-white">Analizată AI</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity">Vezi Arhiva <ChevronRight size={14} className="inline ml-1" /></span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function HomeworkCard({ homework, onClick, idx }: { homework: any, onClick: () => void, idx: number, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      whileHover={{ y: -12, scale: 1.02 }}
      onClick={onClick}
      className="bg-card-bg border border-white/5 p-10 rounded-[48px] flex flex-col gap-8 hover:border-brand-accent/20 transition-all duration-500 cursor-pointer group hover:shadow-[0_40px_80px_rgba(0,0,0,0.4)] relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-brand-accent"></div>
           <span className="text-[9px] font-black uppercase text-brand-accent tracking-[0.3em]">Nouă</span>
        </div>
        <span className="text-[10px] text-white/20 italic font-medium uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5 group-hover:text-white transition-colors">Termen: {new Date(homework.dueDate).toLocaleDateString()}</span>
      </div>
      
      <div className="space-y-4 flex-1 relative z-10">
        <h4 className="serif text-3xl group-hover:text-brand-accent transition-colors leading-tight italic tracking-tight">{homework.title}</h4>
        <p className="text-sm text-white/30 leading-relaxed font-light line-clamp-3 italic opacity-60 group-hover:opacity-100 transition-opacity">"{homework.description}"</p>
      </div>
      
      <div className="mt-auto pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="flex -space-x-2.5">
          {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-4 border-[#0D0D10] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white/20">S{i}</div>)}
          <div key="extra-students" className="w-8 h-8 rounded-full border-4 border-[#0D0D10] bg-brand-accent/10 flex items-center justify-center text-[8px] font-black text-brand-accent">+24</div>
        </div>
        <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-brand-accent translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
          Accesează <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function HomeworkDetail({ homework, profile, onBack }: { homework: any, profile: UserProfile, onBack: () => void }) {
  const [content, setContent] = useState('');
  const [isCode, setIsCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subQuery = useMemo(() => query(
    collection(db, 'submissions'), 
    where('homeworkId', '==', homework.id), 
    where('studentId', '==', profile.uid)
  ), [homework.id, profile.uid]);
  
  const [rawSubs] = useCollectionData(subQuery, { idField: 'id' } as any);
  
  const subs = useMemo(() => {
    if (!rawSubs) return [];
    return [...rawSubs].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // cele mai noi primele
    });
  }, [rawSubs]);

  const mySubmission = subs?.[0]; // Newest submission
  const canResubmit = !mySubmission || mySubmission.hasErrors;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Imaginea este prea mare (max 2MB)");
        return;
      }
      setImageMime(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitHomework = async () => {
    if (!content && !selectedImage) return;
    setSubmitting(true);
    
    try {
      const attemptNumber = (subs?.length || 0) + 1;
      let aiResult = null;
      if (selectedImage || content) {
        aiResult = await analyzeHomework(
          content || "Student a încărcat o imagine pentru analiză.",
          homework.subject,
          isCode,
          attemptNumber,
          selectedImage ? { data: selectedImage, mimeType: imageMime } : undefined
        );
      }

      const rawAnalysis = aiResult?.analysis;
      const isFailedOrIncomplete = !rawAnalysis || 
        rawAnalysis.trim().length < 50 || 
        rawAnalysis.toLowerCase().includes("eroare") || 
        rawAnalysis.toLowerCase().includes("indisponibil") || 
        rawAnalysis.toLowerCase().includes("invalid") || 
        rawAnalysis.toLowerCase().includes("eșuat");

      const clearAiFeedback = isFailedOrIncomplete ? `⚠️ [Analiză temporar indisponibilă sau incompletă]

Rezolvarea ta a fost înregistrată cu succes și trimisă către profesor pentru evaluarea manuală. Din cauza unei nereguli tehnice la conectarea cu modulul Lumi AI, recomandările automate nu au putut fi completate în timp real.

Ce poți face acum pentru a continua:
1. Așteaptă corectarea manuală: Profesorul tău are vizibilitate deplină asupra textului/fișierului încărcat de tine și îl va nota direct în catalogul electronic.
2. Reîncearcă depunerea (Opțional): Dacă dorești neapărat analiza predictivă oferită de inteligența artificială, reîncarcă pagina (F5) pentru a împrospăta sesiunea, asigură-te de claritatea formulării textului sau de luminozitatea imaginii atașate și retrimite tema.
3. Raportează problema: Dacă această discontinuitate continuă, contactează asistența tehnică a școlii.` : rawAnalysis;

      let submissionData: any = {
        homeworkId: homework.id,
        studentId: profile.uid,
        studentName: profile.name,
        attemptNumber,
        content,
        imageUrl: selectedImage || null,
        isCode,
        createdAt: new Date().toISOString(),
        status: 'pending',
        aiFeedback: clearAiFeedback,
        aiDifficulty: aiResult?.difficulty || 'Medium',
        suggestedPoints: aiResult?.suggestedPoints || 0,
        hasErrors: aiResult?.hasErrors || false,
        pointsAwarded: 0,
        subject: homework.subject,
        title: homework.title
      };

      await addDoc(collection(db, 'submissions'), submissionData);
      setFeedback(clearAiFeedback);
    } catch (e) {
      console.error("Error submitting homework", e);
      const catchFeedback = `⚠️ [A apărut o eroare generală la procesare]

Deși s-a produs o eroare tehnică neprevăzută la transmiterea completă a analizei AI, lucrarea ta poate fi verificată în continuare de profesorul tău.

Instrucțiuni de remediere rapidă:
1. Reîncarcă activitatea: Reîmprospătează pagina (Refresh/F5) și încearcă să re-trimiți tema.
2. Dimensiune fișiere: Verifică dacă imaginile depășesc limita admisă sau dacă textul este extrem de scurt.
3. Notare manuală: Nu îți face griji, profesorul îți poate oferi feedback-ul direct dacă evaluarea automată nu s-a finalizat.`;
      setFeedback(catchFeedback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 pb-32 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <button 
        onClick={onBack} 
        className="group flex items-center gap-4 text-white/20 hover:text-brand-accent font-black uppercase text-[10px] tracking-[0.4em] transition-all"
      >
        <div className="w-10 h-px bg-current group-hover:w-16 transition-all"></div>
        Înapoi la Arhivă
      </button>

      <div className="flex flex-col gap-8 p-1 border-l-4 border-brand-accent/40 pl-12 py-2">
        <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic mb-[-8px]">Studiu de Caz</span>
        <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">{homework.title}</h2>
        <p className="text-white/40 text-2xl font-light leading-relaxed max-w-4xl italic serif font-light opacity-60">"{homework.description}"</p>
      </div>

      {profile.role === 'student' && canResubmit && (
        <div className="space-y-12">
          {mySubmission?.hasErrors && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-8 rounded-[40px] flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="serif text-2xl italic text-red-400">Reîncercare Necesară</h4>
                <p className="text-sm text-red-400/60 font-light">Lumi AI a detectat inadvertențe în rezolvarea anterioară. Te rugăm să revizuiești și să trimiți o nouă versiune.</p>
              </div>
            </motion.div>
          )}
          
          <div className="bg-card-bg border border-white/5 rounded-[64px] p-16 space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-accent/40 to-transparent"></div>
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
              <div className="space-y-4">
                <h3 className="serif text-5xl italic text-white">Laborator Personal</h3>
                <p className="text-[11px] uppercase tracking-[0.3em] opacity-30 font-black">Depune rezolvarea pentru validare spectrală</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 p-2 bg-black/40 rounded-[32px] border border-white/5">
                <div className="flex p-1 bg-white/5 rounded-2xl">
                  <button 
                    onClick={() => setIsCode(false)}
                    className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isCode ? 'bg-brand-accent text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
                  >
                    Text
                  </button>
                  <button 
                    onClick={() => setIsCode(true)}
                    className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isCode ? 'bg-brand-accent text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
                  >
                    Source
                  </button>
                </div>
                <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10"
                >
                  <Camera size={16} /> 
                  <span>{selectedImage ? 'Imagine Validă' : 'Atașament Media'}</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-4">
                <textarea 
                  placeholder={isCode ? "// Introduceți codul sursă pentru audit academic..." : "Redactați eseul sau rezolvarea exploratorie aici..."}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[600px] bg-black/60 border border-white/10 rounded-[40px] p-12 font-mono text-base leading-relaxed outline-none focus:border-brand-accent/40 transition-all custom-scrollbar resize-none shadow-inner"
                />
              </div>
              <div className="lg:col-span-4 h-[600px] border-2 border-dashed border-white/5 rounded-[40px] bg-[#0F0F12] overflow-hidden group flex items-center justify-center relative">
                {selectedImage ? (
                  <>
                    <div className="absolute inset-0 bg-brand-accent/5 animate-pulse"></div>
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-8 relative z-10" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-6 right-6 w-12 h-12 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl z-20"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-8 opacity-10 group-hover:opacity-20 transition-all duration-700">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-white mx-auto flex items-center justify-center scale-110">
                      <Sparkles size={48} />
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] uppercase font-black tracking-[0.5em] leading-relaxed">Sisteme de Analiză Vizuală<br/>Lumi AI v2.0 Ready</p>
                      <div className="w-16 h-px bg-white mx-auto"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center gap-8">
               <div className="flex-1 space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-accent">Confirmare Depunere</p>
                  <p className="text-xs text-white/20 italic font-light">Asigură-te că rezolvarea respectă rigorile academice impuse.</p>
               </div>
               <button 
                  onClick={submitHomework}
                  disabled={submitting || (!content && !selectedImage)}
                  className="w-full md:w-auto px-20 py-6 bg-brand-accent text-white font-black rounded-3xl uppercase tracking-[0.4em] text-xs hover:bg-white hover:text-black hover:scale-105 transition-all duration-500 disabled:opacity-30 shadow-2xl shadow-brand-accent/40 flex items-center justify-center gap-4 group"
                >
                  {submitting ? (
                    <span className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      Lumi AI Procesează...
                    </span>
                  ) : (
                    <>Trimite Spre Validare <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" /></>
                  )}
                </button>
            </div>
          </div>
        </div>
      )}

      {(mySubmission || feedback) && (
        <div className="space-y-20 animate-in zoom-in-95 duration-1000">
          <div className="bg-card-bg border border-brand-accent/20 rounded-[64px] p-16 shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-[100px]"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-10 mb-16 border-b border-white/5 pb-10">
              <div className="w-20 h-20 rounded-[32px] bg-brand-accent flex items-center justify-center text-white shadow-[0_0_40px_rgba(10,63,122,0.6)] shrink-0">
                {mySubmission?.status === 'pending' ? <LogIn size={36} /> : <Brain size={36} />}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="serif text-5xl italic text-white mb-2">
                  {mySubmission?.status === 'pending' ? 'Lucrare în Transit' : 'Evaluare Finală'}
                </h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                   <span className="text-[10px] uppercase tracking-[0.3em] font-black text-brand-accent">ID Protocol: #{homework.id.slice(0,6)}</span>
                   <div className="w-1 h-1 bg-white/20 rounded-full my-auto"></div>
                   <span className="text-[10px] uppercase tracking-[0.3em] font-light text-white/30">Depus la {new Date(mySubmission?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="bg-brand-accent/5 px-10 py-6 rounded-[32px] border border-brand-accent/10 flex flex-col items-center">
                 <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Merit Points</span>
                 <span className="text-5xl font-black italic serif text-white tracking-tighter">+{mySubmission?.pointsAwarded || 0}</span>
              </div>
            </div>
            
            <div className="space-y-10 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-px bg-brand-accent/30"></div>
                  <h4 className="serif text-2xl italic text-white/50">Verdict Academic Proiectat</h4>
               </div>
               
               <div className="bg-black/40 p-12 rounded-[40px] border border-white/5 custom-scrollbar max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                 {mySubmission?.status === 'pending' && !feedback ? (
                   <div className="py-12 text-center space-y-4 opacity-30">
                     <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                     <p className="serif text-2xl italic">Lumi AI a finalizat analiza preliminară.</p>
                     <p className="text-xs uppercase tracking-widest">Așteptăm confirmarea academică a profesorului.</p>
                   </div>
                 ) : (
                   <pre className="whitespace-pre-wrap font-sans text-xl font-light text-white/70 italic leading-relaxed first-letter:text-5xl first-letter:font-serif first-letter:text-brand-accent first-letter:mr-2">
                      {feedback || mySubmission?.teacherFeedback || mySubmission?.aiFeedback}
                   </pre>
                 )}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-4 px-2">
                 <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                 <h3 className="serif text-3xl italic text-white/40">Cod Sursă / Manuscris</h3>
              </div>
              <div className="bg-[#0F0F12] border border-white/5 rounded-[48px] p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <FileText size={80} />
                </div>
                <pre className="text-sm font-mono text-white/20 leading-loose overflow-x-auto custom-scrollbar relative z-10 max-h-[500px]">
                  {mySubmission?.content || content}
                </pre>
              </div>
            </div>
            
            <div className="space-y-8">
               <div className="flex items-center gap-4 px-2">
                 <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                 <h3 className="serif text-3xl italic text-white/40">Meta Analiză</h3>
              </div>
              <div className="bg-card-bg border border-white/5 p-10 rounded-[48px] space-y-10">
                 <MetaItem label="Dificultate Proiect" value={mySubmission?.aiDifficulty || "Standard"} color="accent" />
                 <MetaItem label="Puncte Sugerate AI" value={`${mySubmission?.suggestedPoints || 0} PTS`} />
                 <MetaItem label="Stadiu Catalog" value={mySubmission?.status === 'pending' ? 'În curs' : 'Finalizat'} color={mySubmission?.status === 'pending' ? 'yellow' : 'green'} />
                 
                 <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] text-white/10 font-bold uppercase tracking-widest text-center leading-relaxed">AI Metadata System v2.0<br/>Verified Protocol</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, color }: { label: string, value: string, color?: string }) {
  return (
    <div className="space-y-3">
       <p className="text-[9px] uppercase font-black tracking-widest text-white/20">{label}</p>
       <div className={`p-4 rounded-2xl border bg-black/40 ${color === 'accent' ? 'border-brand-accent/20 text-brand-accent' : color === 'yellow' ? 'border-yellow-500/20 text-yellow-500' : color === 'green' ? 'border-green-500/20 text-green-500' : 'border-white/5 text-white/60'}`}>
          <p className="text-sm font-bold tracking-widest uppercase text-center">{value}</p>
       </div>
    </div>
  );
}

function AddHomeworkModal({ subject, schoolCode, userId, onClose, initialClassId }: { subject: string, schoolCode: string, userId: string, onClose: () => void, initialClassId?: string }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || '');

  const q = query(collection(db, 'classes'), where('teacherId', '==', userId), where('subject', '==', subject));
  const [classes] = useCollectionData(q, { idField: 'id' } as any);

  useEffect(() => {
    if (!initialClassId && classes && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, initialClassId]);

  const addHw = async () => {
    if (!title || !due || !selectedClassId) return;
    const newHw = {
      title,
      description: desc,
      subject,
      schoolCode,
      teacherId: userId,
      classId: selectedClassId,
      dueDate: due,
      createdAt: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    await addDoc(collection(db, 'homeworks'), newHw);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card-bg border border-white/10 p-12 rounded-[40px] max-w-xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] border-t-brand-accent/20 my-8"
      >
        <h3 className="serif text-5xl mb-10 italic text-brand-accent tracking-tight underline underline-offset-8">Nouă Temă: {subject}</h3>
        <div className="space-y-6">
          {!initialClassId && (
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Destinație Clasă</label>
              <div className="relative">
                <select 
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/40 outline-none text-sm appearance-none text-white/60 cursor-pointer"
                >
                  {classes?.length === 0 && <option value="">Nu ai clase pentru acest subiect</option>}
                  {classes?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
              {classes?.length === 0 && <p className="text-[10px] text-red-400/50 mt-1 ml-2 italic">Trebuie să creezi o clasă în meniul "Clasele Mele" înainte de a posta teme.</p>}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Denumire Academică</label>
            <input 
              type="text" 
              placeholder="Titlul Temei" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Plan de Lucru</label>
            <textarea 
              placeholder="Instrucțiuni și obiective..." 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              className="w-full h-40 bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold tracking-widest opacity-30 ml-2">Termen Limită</label>
            <input 
              type="date" 
              value={due} 
              onChange={e => setDue(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 focus:border-brand-accent/50 outline-none text-white/40 font-mono tracking-widest"
            />
          </div>
          <div className="flex gap-6 pt-6">
            <button onClick={onClose} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all">Anulează</button>
            <button 
              disabled={!title || !due || !selectedClassId}
              onClick={addHw} 
              className="flex-[2] py-4 bg-brand-accent text-black font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all shadow-xl shadow-brand-accent/10 disabled:opacity-50"
            >
              Publică Temă
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QuizView({ profile, subject, setView }: { profile: UserProfile, subject: string, setView: (v: any) => void }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const startQuiz = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const generated = await generateQuiz(subject, topic);
      if (!generated || !generated.questions || !Array.isArray(generated.questions)) {
        throw new Error("Lumi AI a returnat un format nevalid. Vă rugăm să reîncercați.");
      }
      setQuiz(generated);
      setAnswers(new Array(generated.questions.length).fill(-1));
      setFinished(false);
      setScore(null);
    } catch (e: any) {
      console.error("Quiz Generation Error:", e);
      alert(e.message || "Nu am putut genera Quiz-ul. Încearcă o altă temă sau verifică conexiunea.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    const correct = answers.filter((a, i) => a === quiz.questions[i].correctAnswer).length;
    setScore(correct);
    setFinished(true);
    const points = correct * 20;
    await setDoc(doc(db, 'users', profile.uid), { points: profile.points + points }, { merge: true });
    
    // Add a notification for the success
    await addDoc(collection(db, 'notifications'), {
      userId: profile.uid,
      title: 'Performanță Quiz',
      message: `Ai finalizat evaluarea "${quiz.title}" cu un scor de ${correct}/${quiz.questions.length}. Recapitularea a generat +${points} Merit Points.`,
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-12 animate-in fade-in duration-1000">
      <div className="relative">
        <div className="w-32 h-32 rounded-[40px] bg-brand-accent/20 flex items-center justify-center relative z-10 border border-brand-accent/40 shadow-[0_0_50px_rgba(10,63,122,0.3)] animate-pulse">
           <Brain size={64} className="text-brand-accent" />
        </div>
        <div className="absolute inset-0 bg-brand-accent/20 blur-[100px] animate-ping opacity-20"></div>
      </div>
      <div className="text-center space-y-6">
        <p className="serif text-5xl md:text-6xl italic text-white animate-pulse">Sondăm Inteligența Lumi AI...</p>
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.6em] text-white/30 font-black">Codificăm structura evaluării: {subject}</p>
          <div className="w-40 h-0.5 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ x: '-100%' }}
               animate={{ x: '100%' }}
               transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               className="w-full h-full bg-brand-accent"
             />
          </div>
        </div>
      </div>
    </div>
  );

  if (quiz && !finished) {
    return (
      <div className="max-w-4xl mx-auto space-y-20 pb-40 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-6 relative">
           <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[9px] uppercase font-black tracking-[0.8em] text-brand-accent">Sesiune de Evaluare Formativă</div>
           <h2 className="serif text-6xl md:text-8xl italic leading-none tracking-tighter text-white">{quiz.title}</h2>
           <div className="flex justify-center items-center gap-6">
              <span className="text-[10px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-6 py-2 rounded-full font-black uppercase tracking-widest">{subject}</span>
              <div className="w-1.5 h-1.5 bg-white/10 rounded-full"></div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{quiz.questions.length} Întrebări Auditorii</span>
           </div>
        </div>
        
        <div className="space-y-12">
          {quiz.questions.map((q: any, i: number) => (
            <div key={i} className="bg-card-bg border border-white/5 p-16 rounded-[64px] space-y-12 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
              <div className="flex gap-10 items-start">
                <span className="serif text-7xl italic text-brand-accent/20 font-black leading-none">{i+1}</span>
                <p className="text-2xl font-light leading-relaxed text-white/90 pt-3">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-24">
                {q.options.map((opt: string, optIdx: number) => (
                  <button 
                    key={optIdx}
                    onClick={() => {
                      const newAnswers = [...answers];
                      newAnswers[i] = optIdx;
                      setAnswers(newAnswers);
                    }}
                    className={`p-8 text-left rounded-[32px] border-2 transition-all duration-300 relative overflow-hidden group/opt ${
                      answers[i] === optIdx ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_30px_rgba(10,63,122,0.15)]' : 'bg-black/40 border-white/5 hover:border-white/10 text-white/40 hover:text-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                       <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${answers[i] === optIdx ? 'bg-brand-accent border-brand-accent shadow-inner' : 'border-white/10 bg-white/5'}`}>
                          {answers[i] === optIdx && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </div>
                       <span className="text-lg font-light">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          <div className="pt-12 flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 opacity-20">
               <div className="w-12 h-px bg-white"></div>
               <span className="text-[10px] uppercase font-black tracking-[0.4em]">Sfârșit de sesiune</span>
               <div className="w-12 h-px bg-white"></div>
            </div>
            
            <button 
              disabled={answers.includes(-1)}
              onClick={submitQuiz}
              className="w-full max-w-xl py-7 bg-brand-accent text-white font-black rounded-[32px] uppercase tracking-[0.5em] text-xs hover:bg-white hover:text-black hover:scale-[1.02] disabled:opacity-20 transition-all duration-500 shadow-2xl shadow-brand-accent/30"
            >
              Finalizează Evaluarea
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished && score !== null && quiz) {
    return (
      <div className="max-w-3xl mx-auto py-32 px-8">
         <motion.div 
           initial={{ scale: 0.95, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="text-center space-y-12 p-20 bg-card-bg border border-brand-accent/20 rounded-[80px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative overflow-hidden"
         >
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-accent/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-brand-accent to-transparent"></div>
          
          <div className="w-24 h-24 rounded-[32px] bg-brand-accent/20 border border-brand-accent/30 mx-auto flex items-center justify-center text-brand-accent shadow-2xl">
            <Trophy size={48} className="drop-shadow-[0_0_15px_rgba(10,63,122,0.5)]" />
          </div>
          
          <div className="space-y-4">
            <h2 className="serif text-5xl md:text-7xl italic text-white tracking-tighter">Performanță Validată</h2>
            <p className="text-[10px] uppercase tracking-[0.6em] opacity-30 font-black">Analiza Lumi AI a fost finalizată cu succes</p>
          </div>
          
          <div className="inline-flex flex-col gap-4 p-12 rounded-[48px] bg-black/40 border border-white/5 relative group">
            <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[48px]"></div>
            <p className="text-9xl font-black text-brand-accent italic serif tracking-tighter leading-none relative z-10">{score} / {quiz.questions.length}</p>
            <p className="text-[11px] uppercase tracking-[0.4em] font-black opacity-20 relative z-10 leading-none">Scor de Merit</p>
          </div>
          
          <div className="space-y-8">
            <p className="text-2xl font-light text-white/50 italic serif">Acțiune creditată în catalogul meritocratic cu <span className="text-brand-accent font-black">+{score * 20}</span> PTS.</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setQuiz(null);
                  setFinished(false);
                  setScore(null);
                }} 
                className="flex-1 py-6 bg-white/[0.03] border border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/40 font-black uppercase tracking-[0.3em] text-[10px] rounded-[24px] transition-all duration-500"
              >
                Catalog Quiz-uri
              </button>
              <button 
                onClick={() => setView('dashboard')}
                className="flex-1 py-6 bg-brand-accent text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-[24px] hover:bg-white hover:text-black transition-all duration-500 shadow-xl shadow-brand-accent/20"
              >
                Vezi Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-32 text-center space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-10 border-l border-white/5 pl-12 py-4">
        <div className="w-12 h-px bg-brand-accent/40 mb-10"></div>
        <h2 className="serif text-7xl md:text-9xl italic leading-none tracking-tighter text-white text-left">Audit<br/>Inteligent<span className="text-brand-accent">.</span></h2>
        <p className="text-white/30 font-light tracking-[0.1em] italic text-2xl max-w-2xl text-left serif leading-relaxed">Definește o arie de explorare academică, iar Lumi AI va arhitectura o evaluare bazată pe gradul tău de pregătire.</p>
      </div>
      
      <div className="bg-card-bg border border-white/5 p-16 rounded-[80px] space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent"></div>
        <div className="abstract-glow absolute -bottom-40 -left-40 w-96 h-96 bg-brand-accent/5 rounded-full blur-[100px]"></div>
        
        <div className="text-left space-y-6 relative z-10">
          <label className="text-[10px] uppercase font-black tracking-[0.6em] text-white/20 ml-8 leading-none">Aria de Expertiză / Subiectul</label>
          <div className="relative">
             <Brain size={24} className="absolute left-8 top-1/2 -translate-y-1/2 text-brand-accent opacity-20" />
             <input 
              type="text" 
              placeholder="Ex: Alchimia socială, Teoria relativității restrânse, Pragmatismul literar..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-[40px] py-10 pl-20 pr-10 focus:border-brand-accent focus:shadow-[0_0_40px_rgba(10,63,122,0.1)] outline-none text-2xl md:text-3xl transition-all placeholder:text-white/5 font-light italic serif text-white"
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
           <div className="flex-1 text-left px-8">
              <p className="text-[9px] uppercase font-black tracking-[0.3em] text-white/20 leading-relaxed italic">Protocol de Punctare: +20 Merit Points per răspuns validat. Analiză în timp real.</p>
           </div>
           
           <button 
            onClick={startQuiz}
            disabled={!topic || loading}
            className="w-full md:w-auto px-16 py-7 bg-brand-accent text-white font-black rounded-[32px] uppercase tracking-[0.5em] text-xs hover:bg-white hover:text-black hover:scale-105 transition-all duration-500 shadow-2xl shadow-brand-accent/30 disabled:opacity-20"
          >
            Generează Evaluarea
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left opacity-30">
         <FeatureInfo icon={<Palette size={16} />} title="Audit Adaptiv" desc="Subiectele sunt calibrate manual de Lumi AI." />
         <FeatureInfo icon={<Sparkles size={16} />} title="Merit Feedback" desc="Analiza erorilor după finalizarea evaluării." />
         <FeatureInfo icon={<Settings size={16} />} title="Sesiuni Unice" desc="Niciun test nu este identic cu cel anterior." />
      </div>
    </div>
  );
}

function FeatureInfo({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="space-y-4 p-8 border border-white/5 rounded-[40px]">
       <div className="text-brand-accent">{icon}</div>
       <div className="space-y-2">
          <p className="text-[10px] uppercase font-black tracking-widest text-white">{title}</p>
          <p className="text-[9px] uppercase tracking-widest leading-loose font-bold opacity-60">{desc}</p>
       </div>
    </div>
  );
}

function ClassDetailView({ profile, classData, onClose }: { profile: UserProfile, classData: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'homework' | 'members' | 'dashboard'>(profile.role === 'teacher' ? 'dashboard' : 'homework');
  const [isAddingHw, setIsAddingHw] = useState(false);
  const [selectedHw, setSelectedHw] = useState<any>(null);

  const hwQuery = useMemo(() => query(collection(db, 'homeworks'), where('classId', '==', classData.id)), [classData.id]);
  const [homeworks] = useCollectionData(hwQuery, { idField: 'id' } as any);

  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const studentIds = Array.from(new Set(classData.studentIds || []));
      if (studentIds.length === 0) {
        setMembers([]);
        setLoadingMembers(false);
        return;
      }
      try {
        const mems = await Promise.all(
          studentIds.map(async (id: string) => {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
              return { ...userDoc.data(), uid: userDoc.id };
            }
            return null;
          })
        );
        setMembers(mems.filter(m => m !== null));
      } catch (e) {
        console.error("Error fetching members:", e);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchMembers();
  }, [classData.studentIds]);

  if (selectedHw) {
    if (profile.role === 'teacher') {
      return <TeacherHomeworkControl homework={selectedHw} onBack={() => setSelectedHw(null)} />;
    }
    return <HomeworkDetail profile={profile} homework={selectedHw} onBack={() => setSelectedHw(null)} />;
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <div className="flex flex-col gap-6 border-l-4 border-brand-accent/40 pl-12 py-2">
          <button onClick={onClose} className="flex items-center gap-3 text-white/30 hover:text-brand-accent font-black uppercase text-[10px] tracking-[0.4em] transition-all mb-4 group">
            <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-2 transition-transform" /> Înapoi la Clase
          </button>
          <div className="space-y-1">
            <span className="text-[12px] uppercase font-black tracking-[0.6em] text-brand-accent italic opacity-60">{classData.subject}</span>
            <h2 className="serif text-7xl md:text-8xl italic text-white leading-none tracking-tighter">{classData.name}</h2>
          </div>
          {profile.role === 'teacher' && (
             <div className="flex items-center gap-4 mt-2">
                <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-full flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-widest opacity-30 font-black italic">Cod Acces</span>
                  <span className="text-2xl font-mono text-brand-accent font-black tracking-widest leading-none">{classData.joinCode}</span>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="flex items-center gap-2">
                   <Users size={16} className="text-white/20" />
                   <span className="text-[11px] font-black italic text-white/40">{classData.studentIds?.length || 0} Înrolați</span>
                </div>
             </div>
          )}
        </div>

        {profile.role === 'teacher' && (
           <button 
             onClick={() => setIsAddingHw(true)}
             className="flex items-center gap-4 px-10 py-6 bg-brand-accent text-white font-black rounded-3xl uppercase tracking-[0.3em] text-[10px] hover:bg-white hover:text-black transition-all shadow-2xl shadow-brand-accent/30 group active:scale-95"
           >
             <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Postează Temă Nouă
           </button>
        )}
      </div>

      <div className="flex gap-12 border-b border-white/5 overflow-x-auto no-scrollbar">
        {profile.role === 'teacher' && (
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`pb-6 text-[10px] uppercase font-black tracking-[0.4em] transition-all relative whitespace-nowrap ${activeTab === 'dashboard' ? 'text-brand-accent' : 'text-white/20 hover:text-white'}`}
          >
            Tablou Academic
            {activeTab === 'dashboard' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-accent shadow-[0_0_15px_rgba(10,63,122,0.8)]" />}
          </button>
        )}
        <button 
          onClick={() => setActiveTab('homework')}
          className={`pb-6 text-[10px] uppercase font-black tracking-[0.4em] transition-all relative whitespace-nowrap ${activeTab === 'homework' ? 'text-brand-accent' : 'text-white/20 hover:text-white'}`}
        >
          Tematică & Evaluări
          {activeTab === 'homework' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-accent shadow-[0_0_15px_rgba(10,63,122,0.8)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`pb-6 text-[10px] uppercase font-black tracking-[0.4em] transition-all relative whitespace-nowrap ${activeTab === 'members' ? 'text-brand-accent' : 'text-white/20 hover:text-white'}`}
        >
          Catalog Studenți
          {activeTab === 'members' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-accent shadow-[0_0_15px_rgba(10,63,122,0.8)]" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && profile.role === 'teacher' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="dashboard-tab"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10"
          >
            <div className="lg:col-span-8 space-y-10">
               <div className="bg-card-bg border border-white/5 p-12 rounded-[56px] space-y-8 relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                    <Brain size={120} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="serif text-4xl italic text-white">Performanță Colectivă</h3>
                    <p className="text-white/30 text-lg serif italic">Distribuția excelenței în cadrul grupei {classData.name}.</p>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
                    <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 space-y-2">
                       <span className="text-[9px] uppercase font-black text-brand-accent tracking-widest italic opacity-50">Teme Active</span>
                       <p className="serif text-5xl font-black text-white italic">{homeworks?.length || 0}</p>
                    </div>
                    <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 space-y-2">
                       <span className="text-[9px] uppercase font-black text-brand-accent tracking-widest italic opacity-50">Studenți</span>
                       <p className="serif text-5xl font-black text-white italic">{classData.studentIds?.length || 0}</p>
                    </div>
                    <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 space-y-2">
                       <span className="text-[9px] uppercase font-black text-green-400 tracking-widest italic opacity-50">Promovabilitate</span>
                       <p className="serif text-5xl font-black text-white italic">84%</p>
                    </div>
                    <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 space-y-2">
                       <span className="text-[9px] uppercase font-black text-orange-400 tracking-widest italic opacity-50">Restante</span>
                       <p className="serif text-5xl font-black text-white italic">12</p>
                    </div>
                 </div>
               </div>

               <div className="bg-card-bg border border-white/5 p-12 rounded-[56px] space-y-8 shadow-2xl">
                  <h4 className="serif text-3xl italic text-white flex items-center gap-4">
                     <Star size={24} className="text-brand-accent" /> Top Evoluție Săptămânală
                  </h4>
                  <div className="space-y-4">
                     {members.slice(0, 3).map((m, i) => (
                       <div key={m.uid} className="flex items-center justify-between p-6 bg-black/20 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-6">
                             <span className="serif text-2xl italic font-black text-white/20">0{i+1}</span>
                             <p className="text-lg font-bold text-white/80">{m.name}</p>
                          </div>
                          <div className="px-6 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                             <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">+{Math.floor(Math.random() * 50) + 20} Pts</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
               <div className="bg-card-bg border border-white/5 p-10 rounded-[48px] space-y-8 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/5 to-transparent"></div>
                 <h4 className="serif text-2xl italic text-white relative z-10">Note Rapide</h4>
                 <textarea 
                   placeholder="Observații despre curs..." 
                   className="w-full h-64 bg-black/40 border border-white/5 rounded-3xl p-6 focus:border-brand-accent outline-none text-sm serif italic relative z-10 shadow-inner"
                 />
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'homework' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            key="homework-tab"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {homeworks?.length === 0 && (
              <div key="empty-class-hw" className="col-span-full py-40 text-center border-2 border-dashed border-white/5 rounded-[64px] bg-white/[0.01]">
                <BookOpen size={64} className="mx-auto text-white/5 mb-8" />
                <p className="text-white/20 serif text-3xl italic leading-relaxed max-w-sm mx-auto">Niciun protocol academic atribuit acestei grupe momentan.</p>
              </div>
            )}
            {homeworks?.map((hw: any, idx) => (
              <HomeworkCard key={hw.id} homework={hw} onClick={() => setSelectedHw(hw)} idx={idx} />
            ))}
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key="members-tab"
            className="space-y-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {loadingMembers && (
                <div key="loading-mems" className="col-span-full text-center py-20 text-brand-accent animate-pulse serif italic text-2xl">Accesare bază date studenți...</div>
              )}
              {!loadingMembers && members.length === 0 && (
                 <div key="empty-members" className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[64px] bg-black/20">
                    <p className="serif text-3xl italic text-white/10">Registrul studenților este vid.</p>
                 </div>
              )}
              {members.map((m: any) => (
                <div key={m.uid} className="bg-card-bg border border-white/5 p-10 rounded-[48px] flex flex-col gap-6 hover:border-brand-accent/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-700 group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.02]">
                      <UserIcon size={60} />
                   </div>
                   <div className="w-20 h-20 rounded-[32px] bg-black shadow-inner flex items-center justify-center border border-white/5 group-hover:rotate-6 transition-transform duration-500">
                      <UserIcon size={32} className="text-white/20 group-hover:text-brand-accent transition-colors" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-xl font-black text-white/90 group-hover:text-white transition-colors">{m.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-brand-accent font-black italic opacity-40">Nivel Academic: Rank {getRank(m.points || 0).current.name}</p>
                   </div>
                   <div className="mt-4 pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                         <span className="text-[9px] uppercase font-black tracking-widest text-white/20">Punctaj</span>
                         <span className="text-2xl font-serif italic font-black text-white">{m.points || 0}</span>
                      </div>
                      <button className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-brand-accent hover:border-brand-accent/20 transition-all">
                         <LayoutDashboard size={18} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAddingHw && (
        <AddHomeworkModal 
          subject={classData.subject} 
          schoolCode={profile.schoolCode!} 
          userId={profile.uid} 
          initialClassId={classData.id}
          onClose={() => setIsAddingHw(false)} 
        />
      )}
    </div>
  );
}

function TeacherHomeworkControl({ homework, onBack }: { homework: any, onBack: () => void }) {
  const subQuery = useMemo(() => query(collection(db, 'submissions'), where('homeworkId', '==', homework.id)), [homework.id]);
  const [submissions, loading] = useCollectionData(subQuery, { idField: 'id' } as any);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [points, setPoints] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  const gradeSubmission = async () => {
    if (!selectedSub || saving) return;
    setSaving(true);
    try {
      const studentDoc = await getDoc(doc(db, 'users', selectedSub.studentId));
      const currentPoints = studentDoc.data()?.points || 0;
      
      await updateDoc(doc(db, 'submissions', selectedSub.id), {
        teacherFeedback,
        pointsAwarded: points,
        status: 'graded'
      });
      
      await updateDoc(doc(db, 'users', selectedSub.studentId), {
        points: currentPoints + points
      });

      // Notificare pentru elev
      await addDoc(collection(db, 'notifications'), {
        userId: selectedSub.studentId,
        title: 'Temă Evaluată!',
        message: `Profesorul a evaluat tema la ${homework.subject}. Ai primit ${points} puncte.`,
        type: 'info',
        read: false,
        createdAt: Date.now()
      });
      
      setSelectedSub(null);
      setTeacherFeedback('');
    } catch (e) {
      console.error(e);
      alert("Eroare la notare.");
    } finally {
      setSaving(false);
    }
  };

  if (selectedSub) {
    return (
      <div className="space-y-12 pb-24">
        <button onClick={() => setSelectedSub(null)} className="flex items-center gap-3 text-white/30 hover:text-brand-accent font-bold uppercase text-[9px] tracking-[0.2em] transition-all">
          <ChevronRight size={14} className="rotate-180" /> Înapoi la Listă
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="serif text-3xl italic opacity-30 px-2 tracking-widest">Lucrarea Studentului</h3>
              <div className="bg-card-bg border border-white/5 rounded-[48px] p-12 shadow-2xl min-h-[400px] flex flex-col gap-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                  <BookOpen size={120} />
                </div>
                {selectedSub.imageUrl && (
                  <div className="w-full bg-black/40 rounded-3xl border border-white/10 overflow-hidden p-6 group">
                     <p className="text-[9px] uppercase font-black tracking-widest opacity-30 mb-6 ml-2 flex items-center gap-2">
                       <Camera size={12} className="text-brand-accent" /> Proba Vizuală
                     </p>
                     <img src={selectedSub.imageUrl} alt="Student Work" className="w-full h-auto rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <p className="text-[9px] uppercase font-black tracking-widest opacity-30 ml-2 flex items-center gap-2">
                    <LayoutDashboard size={12} className="text-brand-accent" /> Textul Rezolvării
                  </p>
                  <pre className="text-sm font-mono text-white/80 leading-relaxed whitespace-pre-wrap bg-black/40 p-8 rounded-[32px] border border-white/5 shadow-inner">
                    {selectedSub.content || "Fără conținut text."}
                  </pre>
                </div>
              </div>
            </div>

            {selectedSub.aiFeedback && (
              <div className="space-y-6">
                <h3 className="serif text-3xl italic opacity-30 px-2 tracking-widest flex items-center gap-4">
                  Analiza Lumi AI <span className="text-[10px] font-mono not-italic text-brand-accent px-3 py-1 bg-brand-accent/10 rounded-full">Referință</span>
                </h3>
                <div className="bg-brand-accent/[0.03] border border-brand-accent/10 rounded-[40px] p-10 space-y-6 relative group">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Brain size={40} className="text-brand-accent" />
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="px-4 py-1.5 bg-brand-accent/10 rounded-full border border-brand-accent/20">
                      <span className="text-[9px] font-black uppercase text-brand-accent italic tracking-widest">Scor Sugerat: {selectedSub.suggestedPoints || 0} Pts</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed italic serif opacity-80 whitespace-pre-wrap">{selectedSub.aiFeedback}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="serif text-3xl italic text-brand-accent px-2 tracking-widest">Protocol Evaluare</h3>
              <div className="bg-card-bg border border-brand-accent/20 p-12 rounded-[56px] space-y-10 shadow-[0_40px_80px_rgba(10,63,122,0.15)] relative">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent italic ml-2">Analiza Profesorului</label>
                  <textarea 
                    value={teacherFeedback}
                    onChange={e => setTeacherFeedback(e.target.value)}
                    placeholder="Introdu corecturile, sugestiile și feedback-ul tău academic..."
                    className="w-full h-64 bg-black/60 border border-white/10 rounded-[32px] p-8 focus:border-brand-accent outline-none text-white/90 text-lg serif italic leading-relaxed placeholder:opacity-10 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <label className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent italic">Credit Academic (Puncte)</label>
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Max sugerat: 250</span>
                  </div>
                  <div className="relative group">
                    <input 
                      type="number"
                      value={points}
                      onChange={e => setPoints(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-[32px] p-8 focus:border-brand-accent outline-none text-6xl font-black font-serif italic text-brand-accent tracking-tighter text-center shadow-inner transition-all group-hover:bg-black/80"
                    />
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                      <Star size={32} className="text-brand-accent" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={gradeSubmission}
                  disabled={saving}
                  className="w-full py-8 bg-brand-accent text-white font-black uppercase text-xs tracking-[0.6em] rounded-[32px] hover:bg-white hover:text-black transition-all duration-700 shadow-2xl shadow-brand-accent/40 active:scale-[0.98] relative overflow-hidden group/btn"
                >
                  <span className="relative z-10">{saving ? 'Se finalizează protocolul...' : 'Înregistrează Nota'}</span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                </button>

                <p className="text-[9px] text-center text-white/20 font-medium uppercase tracking-widest mt-4">Punctele vor fi adăugate instantaneu la rangul studentului.</p>
              </div>
            </div>

            <div className="p-10 bg-brand-accent/5 border border-brand-accent/10 rounded-[40px] space-y-4">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-brand-accent italic flex items-center gap-2">
                <Brain size={14} /> Sfaturi Corectură AI
              </h4>
              <p className="text-xs text-white/30 italic serif leading-relaxed">
                Poți folosi analiza AI ca bază, dar decizia finală îți aparține. Elevul va primi o notificare instantanee cu feedback-ul tău.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-4 border-l border-brand-accent/20 pl-10">
          <button onClick={onBack} className="flex items-center gap-3 text-white/30 hover:text-brand-accent font-bold uppercase text-[9px] tracking-[0.2em] transition-all mb-4">
            <ChevronRight size={14} className="rotate-180" /> Înapoi la Clasă
          </button>
          <h2 className="serif text-6xl italic leading-none">{homework.title}</h2>
          <p className="text-white/40 font-light tracking-wide italic">Monitorizare depuneri studenți</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <p key="loading-submissions" className="text-brand-accent animate-pulse">Se încarcă depunerile...</p>
        ) : submissions?.length === 0 ? (
          <p key="empty-submissions" className="text-white/20 italic">Nicio depunere înregistrată încă.</p>
        ) : (
          submissions?.map((sub: any) => (
            <div key={sub.id} className="bg-card-bg border border-white/5 p-8 rounded-3xl flex items-center justify-between group hover:border-brand-accent/20 transition-all">
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20 ${sub.status === 'graded' ? 'bg-green-500/10' : 'bg-brand-accent/10'}`}>
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/80">{sub.studentName || 'Student Anonymous'}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-30 font-bold">Trimis la {new Date(sub.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {sub.status === 'graded' && (
                  <div className="text-right">
                    <p className="text-brand-accent font-serif italic text-2xl leading-none">+{sub.pointsAwarded}</p>
                    <p className="text-[8px] uppercase tracking-widest opacity-20 font-bold">Puncte Acordate</p>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedSub(sub)}
                  className="px-6 py-3 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-black hover:border-brand-accent transition-all"
                >
                  {sub.status === 'graded' ? 'Revizuiește' : 'Evaluează'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TeacherClassesView({ profile }: { profile: UserProfile }) {
  const [className, setClassName] = useState('');
  const [selectedSub, setSelectedSub] = useState(profile.teacherSubject || SUBJECTS[0]);
  const [enteringClass, setEnteringClass] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);
  
  const q = useMemo(() => query(
    collection(db, 'classes'), 
    where('teacherId', '==', profile.uid)
  ), [profile.uid]);

  const [classes, loading, error] = useCollectionData(q, { idField: 'id' } as any);

  const sortedClasses = useMemo(() => {
    if (!classes) return [];
    return [...classes].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [classes]);

  if (enteringClass) {
    return <ClassDetailView profile={profile} classData={enteringClass} onClose={() => setEnteringClass(null)} />;
  }

  const createClass = async () => {
    if (!className || creating) return;
    setCreating(true);
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      await addDoc(collection(db, 'classes'), {
        name: className,
        subject: selectedSub,
        teacherId: profile.uid,
        teacherName: profile.name,
        schoolCode: profile.schoolCode,
        joinCode: joinCode,
        studentIds: [],
        createdAt: new Date().toISOString()
      });
      setLastCreatedCode(joinCode);
      setClassName('');
      setTimeout(() => setLastCreatedCode(null), 15000);
    } catch (e: any) {
      console.error("Error creating class:", e);
      alert(`Eroare la crearea clasei: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteClass = async (id: string) => {
    if (confirm('Ești sigur că vrei să ștergi această clasă?')) {
      await deleteDoc(doc(db, 'classes', id));
    }
  };

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
          <div className="space-y-4">
             <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Gestiune Academică</span>
             <h2 className="serif text-5xl md:text-7xl italic text-white leading-none tracking-tighter">Salut, {profile.name}</h2>
          </div>
          <div className="text-right">
             <p className="text-[11px] uppercase tracking-[0.4em] text-white/20 font-black leading-relaxed italic">Audit Clase Disponsibil<br/>Criptare JoinCode activă</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4">
           <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-t-brand-accent/20 sticky top-32">
             <div className="space-y-4">
                <h3 className="serif text-4xl italic text-brand-accent">Înregistrare Grupă</h3>
                <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-black">Adaugă un nou nucleu de studiu</p>
             </div>
             
             <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Identificativ Clasă</label>
                  <input 
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    placeholder="Ex: Clasa a XI-a B"
                    className="w-full bg-black/60 border border-white/10 rounded-3xl p-6 text-lg font-light text-white focus:border-brand-accent/40 outline-none transition-all shadow-inner"
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Subiect Academic</label>
                  <div className="relative">
                    <select 
                      value={selectedSub}
                      onChange={e => setSelectedSub(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-3xl p-6 text-sm appearance-none text-white/60 cursor-pointer font-black uppercase tracking-widest focus:border-brand-accent/40 outline-none shadow-inner"
                    >
                      {SUBJECTS.map(s => <option key={s} value={s} className="bg-[#0A0A0C]">{s}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 text-brand-accent">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={createClass}
                  disabled={!className || creating}
                  className="w-full py-7 bg-brand-accent text-white font-black uppercase text-xs tracking-[0.4em] rounded-[32px] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl shadow-brand-accent/30 disabled:opacity-20"
                >
                  {creating ? 'Procesare...' : 'Finalizează Configurația'}
                </button>

                <AnimatePresence>
                  {lastCreatedCode && (
                    <motion.div 
                      key="join-code-feedback"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-green-500/10 border border-green-500/20 p-8 rounded-[32px] flex flex-col items-center gap-4 overflow-hidden shadow-2xl"
                    >
                       <span className="text-[10px] uppercase font-black text-green-500/60 tracking-widest italic leading-none">Cod Generat cu Succes</span>
                       <span className="text-5xl font-mono font-black text-green-400 tracking-[0.2em] leading-none">{lastCreatedCode}</span>
                       <span className="text-[10px] text-green-500/40 uppercase font-black italic text-center leading-relaxed">Distribuie codul studenților pentru înrolare.</span>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
           </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading && (
            <div className="col-span-full py-20 text-center">
              <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="serif italic text-white/40">Se încarcă arhiva de clase...</p>
            </div>
          )}

          {error && (
            <div className="col-span-full py-20 text-center text-red-400 bg-red-400/5 rounded-[48px] border border-red-400/10">
              <AlertCircle size={32} className="mx-auto mb-4" />
              <p className="serif italic">Eroare la conectare: {error.message}</p>
            </div>
          )}

          {!loading && classes?.length === 0 && (
            <div className="col-span-full py-40 text-center border-2 border-dashed border-white/5 rounded-[64px] bg-white/[0.01]">
               <SchoolIcon size={48} className="mx-auto mb-8 opacity-10" />
               <p className="serif text-3xl italic text-white/20 leading-relaxed max-w-sm mx-auto">Nu ai nicio clasă activă. Folosește panoul din stânga pentru a înregistra prima grupă.</p>
            </div>
          )}

          {sortedClasses.map((c: any) => (
            <div 
              key={c.id} 
              onClick={() => setEnteringClass(c)}
              className="p-12 bg-card-bg border border-white/5 rounded-[64px] flex flex-col gap-10 relative group hover:bg-[#0D0D10] transition-all duration-700 cursor-pointer overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteClass(c.id);
                }}
                className="absolute top-10 right-10 p-4 text-white/5 hover:text-red-500 hover:bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 z-10"
              >
                <Trash2 size={20} />
              </button>
              
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent italic">{c.subject}</span>
                <h4 className="serif text-5xl italic leading-none text-white group-hover:translate-x-2 transition-transform duration-700">{c.name}</h4>
              </div>

              <div className="bg-black/60 p-8 rounded-[32px] border border-white/5 flex flex-col items-center relative overflow-hidden group/code shadow-inner">
                 <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover/code:opacity-100 transition-opacity"></div>
                 <span className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-3 relative z-10">Protocol Înrolare</span>
                 <span className="text-4xl font-mono font-black tracking-[0.4em] text-brand-accent relative z-10">{c.joinCode}</span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/5">
                <div className="flex items-center gap-6">
                   <div className="flex -space-x-4">
                    {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full border-[3px] border-card-bg bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-black uppercase">
                      <UserIcon size={14} />
                    </div>)}
                  </div>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{c.studentIds?.length || 0} Studenți</span>
                </div>
                <div 
                  className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all group-hover:shadow-[0_0_20px_rgba(10,63,122,0.3)]"
                >
                   <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentClassesView({ profile }: { profile: UserProfile }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [enteringClass, setEnteringClass] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const q = useMemo(() => query(collection(db, 'classes'), where('studentIds', 'array-contains', profile.uid)), [profile.uid]);
  const [classes, loading] = useCollectionData(q, { idField: 'id' } as any);

  if (enteringClass) {
    return <ClassDetailView profile={profile} classData={enteringClass} onClose={() => setEnteringClass(null)} />;
  }

  const joinClass = async () => {
    if (!code) return;
    setJoining(true);
    try {
      const classQuery = query(collection(db, 'classes'), where('joinCode', '==', code.toUpperCase()), limit(1));
      const querySnapshot = await getDocs(classQuery);
      
      if (querySnapshot.empty) {
        alert('Codul nu este valid.');
        return;
      }

      const classDoc = querySnapshot.docs[0];
      const classData = classDoc.data();

      if (classData.studentIds.includes(profile.uid)) {
        alert('Ești deja în această clasă.');
        return;
      }

      await updateDoc(doc(db, 'classes', classDoc.id), {
        studentIds: arrayUnion(profile.uid)
      });
      setCode('');
    } catch (e) {
      alert('Eroare la înscriere.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-16">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="serif text-6xl mb-3 italic tracking-tight underline underline-offset-[12px] decoration-brand-accent/20">Clasele Tale</h2>
            <p className="text-white/40 font-light tracking-widest uppercase text-xs">Grupele academice în care ești înrolat</p>
          </div>
          <div className="flex gap-4 bg-card-bg border border-white/5 p-2 rounded-2xl">
             <input 
               type="text" 
               placeholder="INTRODU COD CLASĂ" 
               value={code}
               onChange={e => setCode(e.target.value.toUpperCase())}
               className="bg-black/40 border border-white/5 rounded-xl px-6 py-3 text-xs font-mono tracking-widest focus:border-brand-accent outline-none w-48 transition-all"
             />
             <button 
               onClick={joinClass}
               disabled={joining || !code}
               className="bg-brand-accent text-black font-bold uppercase text-[10px] tracking-widest px-8 rounded-xl hover:bg-white transition-all disabled:opacity-50"
             >
               {joining ? 'Joining...' : 'Înscrie-te'}
             </button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes?.map((c: any) => (
          <div 
            key={c.id} 
            onClick={() => setEnteringClass(c)}
            className="p-10 bg-card-bg border border-white/5 rounded-[40px] flex flex-col gap-6 relative group hover:bg-[#15151A] transition-all cursor-pointer overflow-hidden border-l-brand-accent/10 border-l-4"
          >
            <div className="flex flex-col gap-2">
              <span className="text-[8px] uppercase font-bold tracking-[0.4em] text-brand-accent/50">{c.subject}</span>
              <h4 className="serif text-4xl italic leading-none">{c.name}</h4>
            </div>
            <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="flex -space-x-3">
                  {[1,2,3].map(i => <div key={i} className="w-7 h-7 rounded-full border-2 border-card-bg bg-zinc-800" />)}
                </div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{c.studentIds?.length || 0} Colegi</span>
              </div>
              <div 
                className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-accent group-hover:underline underline-offset-4 decoration-brand-accent/40 transition-all font-black"
              >
                Intră în Clasă <ChevronRight size={14} className="inline ml-1" />
              </div>
            </div>
          </div>
        ))}
        {classes?.length === 0 && (
          <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[60px]">
            <LayoutDashboard size={48} className="mx-auto text-white/5 mb-6" />
            <p className="text-white/20 italic font-light tracking-wide">Nu ești înrolat în nicio clasă momentan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolActivityView({ profile, schoolData }: { profile: UserProfile, schoolData?: any }) {
  const q = useMemo(() => query(collection(db, 'users'), where('schoolCode', '==', profile.schoolCode)), [profile.schoolCode]);
  const [users, loading] = useCollectionData(q, { idField: 'id' } as any);

  const qClasses = useMemo(() => query(collection(db, 'classes'), where('schoolCode', '==', profile.schoolCode)), [profile.schoolCode]);
  const [classes, loadingClasses] = useCollectionData(qClasses, { idField: 'id' } as any);

  if (profile.role !== 'director') return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="max-w-md text-center space-y-8 bg-card-bg border border-white/5 p-16 rounded-[64px]">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[32px] flex items-center justify-center mx-auto">
          <Lock size={40} />
        </div>
        <h2 className="serif text-4xl italic text-white">Acces Restricționat</h2>
        <p className="text-white/30 serif italic">Doar directorii instituției pot accesa registrul de activitate globală.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Audit Instituțional</span>
           <h2 className="serif text-5xl md:text-7xl italic text-white leading-none tracking-tighter">Activitate Școală</h2>
        </div>
        <div className="bg-card-bg border border-white/5 px-10 py-6 rounded-[32px] flex flex-col items-center shadow-inner relative overflow-hidden group">
           <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <span className="text-[9px] uppercase font-black tracking-widest opacity-20 mb-2 relative z-10">Cod Scoală</span>
           <span className="text-3xl font-mono font-black tracking-[0.2em] text-brand-accent relative z-10">{profile.schoolCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-1 space-y-8">
           <MetaStat label="Membri Înrolați" value={users?.length || 0} icon={<UserIcon size={16} />} />
           <MetaStat label="Corp Didactic" value={users?.filter(u => u.role === 'teacher').length || 0} icon={<UserCheck size={16} />} color="text-brand-accent" />
           <MetaStat label="Comunitate Elevi" value={users?.filter(u => u.role === 'student').length || 0} icon={<GraduationCap size={16} />} color="text-white/40" />
           <MetaStat label="Clase Active" value={classes?.length || 0} icon={<SchoolIcon size={16} />} />
        </div>

        <div className="lg:col-span-3 space-y-16">
           <div className="bg-card-bg border border-white/5 rounded-[64px] overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-white/5">
                <h3 className="serif text-2xl italic text-white">Registru Utilizatori</h3>
             </div>
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-white/[0.02] border-b border-white/5">
                   <th className="px-12 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30">Identitate Membru</th>
                   <th className="px-12 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30 text-center">Protocol Rol</th>
                   <th className="px-12 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30 text-right">Dată Înrolare</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {loading && <tr><td colSpan={3} className="px-12 py-32 text-center text-brand-accent animate-pulse serif text-2xl italic">Sincronizăm bazele de date...</td></tr>}
                 {users?.map((u: any) => (
                   <tr key={u.uid} className="hover:bg-white/[0.01] transition-colors group">
                     <td className="px-12 py-8">
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/10 group-hover:bg-brand-accent group-hover:text-white transition-all">
                              <UserIcon size={20} />
                           </div>
                           <span className="serif italic text-2xl text-white/80 group-hover:text-white transition-colors">{u.name}</span>
                        </div>
                     </td>
                     <td className="px-12 py-8">
                        <div className="flex justify-center">
                          <span className={`text-[9px] px-6 py-2 rounded-full font-black uppercase tracking-[0.3em] border transition-all ${u.role === 'teacher' ? 'bg-brand-accent/5 text-brand-accent border-brand-accent/10' : u.role === 'director' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-white/5 text-white/20 border-white/5'}`}>
                            {u.role === 'teacher' ? 'Profesor' : u.role === 'director' ? 'Director' : 'Elev'}
                          </span>
                        </div>
                     </td>
                     <td className="px-12 py-8 text-right">
                        <span className="text-[10px] text-white/10 uppercase font-black tracking-widest">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Protocol Nou'}
                        </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {profile.role === 'director' && (
             <div className="bg-card-bg border border-white/5 rounded-[64px] overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5">
                  <h3 className="serif text-2xl italic text-white">Inventar Clase Activite</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-12">
                 {loadingClasses && <p className="text-white/20 animate-pulse text-center col-span-2 py-20">Certificăm structurile de studiu...</p>}
                 {classes?.length === 0 && <p className="text-white/20 italic text-center col-span-2 py-20">Nicio clasă înregistrată sub acest cod școlar.</p>}
                 {classes?.map((c: any) => (
                   <div key={c.id} className="bg-white/[0.02] border border-white/5 p-8 rounded-[40px] hover:bg-white/[0.05] transition-all group">
                     <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent italic mb-2 block">{c.subject}</span>
                     <h4 className="serif text-3xl italic text-white mb-4">{c.name}</h4>
                     <div className="flex justify-between items-center pt-6 border-t border-white/5">
                        <div className="flex flex-col">
                           <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Profesor Coordonator</span>
                           <span className="text-xs text-white/60 font-medium">{c.teacherName}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold block">Efectiv Elevi</span>
                           <span className="text-xs text-brand-accent font-black italic serif">{c.studentIds?.length || 0} MEMBRI</span>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function MetaStat({ label, value, icon, color }: { label: string, value: any, icon: any, color?: string }) {
  return (
    <div className="bg-card-bg border border-white/5 p-10 rounded-[48px] space-y-4 hover:border-brand-accent/20 transition-all group shadow-xl">
       <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-brand-accent group-hover:text-white transition-all`}>
          {icon}
       </div>
       <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/10 font-black italic">{label}</span>
          <p className={`serif text-5xl italic ${color || 'text-white'} leading-none tracking-tighter`}>{value}</p>
       </div>
    </div>
  );
}

function RankingView({ profile }: { profile: UserProfile }) {
  const rankingQuery = React.useMemo(() => query(
    collection(db, 'users'), 
    where('schoolCode', '==', profile.schoolCode),
    where('role', '==', 'student'),
    orderBy('points', 'desc'),
    limit(20)
  ), [profile.schoolCode]);
  const [topUsers, loading] = useCollectionData(rankingQuery, { idField: 'id' } as any);

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Elite Academice</span>
           <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Ierarhia Meritocrată</h2>
        </div>
        <div className="text-right">
           <p className="text-[11px] uppercase tracking-[0.4em] text-white/20 font-black leading-relaxed italic">Date Sincronizate LIVE<br/>Calcul Pondere G emini Integrat</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div key="loading-ranking" className="py-40 flex flex-col items-center gap-8">
            <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
            <p className="serif text-2xl italic text-white/10">Analizăm parcursul membrilor...</p>
          </div>
        ) : (
          topUsers?.map((user: any, index: number) => {
            const rank = getRank(user.points).current;
            const isMe = user.uid === profile.uid;
            
            return (
              <motion.div 
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.8 }}
                key={user.uid} 
                className={`bg-card-bg border ${isMe ? 'border-brand-accent/40 shadow-[0_0_40px_rgba(10,63,122,0.15)] bg-white/5' : 'border-white/5 hover:border-white/10'} p-10 rounded-[64px] flex items-center gap-12 transition-all group relative overflow-hidden`}
              >
                {isMe && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent"></div>
                )}
                
                <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center font-black italic serif text-4xl shrink-0 ${
                  index === 0 ? 'bg-yellow-500/10 text-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 
                  index === 1 ? 'bg-zinc-400/10 text-zinc-400' : 
                  index === 2 ? 'bg-orange-500/10 text-orange-500 font-bold' : 
                  'text-white/5 bg-white/[0.01]'
                }`}>
                  {index + 1}
                </div>

                <div className="w-20 h-20 rounded-full bg-black/40 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden text-white/10 relative">
                   <div className="absolute inset-0 bg-brand-accent/5 opacity-20"></div>
                   <UserIcon size={32} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <h4 className={`serif text-4xl italic ${isMe ? 'text-white' : 'text-white/80'} group-hover:translate-x-2 transition-transform duration-500`}>
                      {user.name} 
                    </h4>
                    {isMe && <span className="text-[9px] bg-brand-accent text-white px-4 py-1 rounded-[10px] uppercase font-black tracking-widest shadow-lg">Tu</span>}
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rank.color }}></span>
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: rank.color }}>{rank.name}</span>
                     </div>
                     <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                     <p className="text-[10px] uppercase tracking-widest text-white/10 font-bold">Membru din {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-6xl font-black italic serif text-brand-accent leading-none tracking-tighter">{user.points.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black mt-2">Merit Points</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AnnouncementsView({ profile }: { profile: UserProfile }) {
  const announcementsQuery = React.useMemo(() => query(
    collection(db, 'announcements'),
    where('schoolCode', '==', profile.schoolCode),
    orderBy('createdAt', 'desc')
  ), [profile.schoolCode]);
  const [announcements, loading, error] = useCollectionData(announcementsQuery, { idField: 'id' } as any);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        schoolCode: profile.schoolCode,
        authorId: profile.uid,
        authorName: profile.name,
        title,
        content,
        createdAt: Date.now()
      });
      setTitle('');
      setContent('');
      setIsPosting(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Comunicare Instituțională</span>
           <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Anunțuri Școală</h2>
        </div>
        {profile.role === 'teacher' && (
          <button 
            onClick={() => setIsPosting(!isPosting)}
            className="flex items-center gap-4 bg-brand-accent text-white px-10 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl shadow-brand-accent/20"
          >
            {isPosting ? 'Anulează' : 'Publică Anunț'}
            <Megaphone size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <form onSubmit={handlePost} className="bg-card-bg border border-brand-accent/30 p-16 rounded-[64px] space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.4)]">
              <div className="space-y-4 border-l-2 border-brand-accent/20 pl-8">
                 <span className="text-[9px] uppercase font-black tracking-widest text-brand-accent">Protocol Headline</span>
                 <input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Introduceți titlul comunicării..."
                  className="w-full bg-transparent serif text-5xl italic text-white focus:outline-none placeholder:text-white/5"
                  required
                />
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Manuscris Detaliat</label>
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Redactați mesajul oficial pentru comunitatea academică..."
                  className="w-full bg-black/40 border border-white/5 rounded-[40px] p-10 text-white/70 font-light text-xl min-h-[250px] focus:border-brand-accent/40 outline-none transition-all shadow-inner resize-none italic serif"
                  required
                />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="flex items-center gap-4 bg-white text-black px-12 py-6 rounded-[24px] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-2xl">
                  Lansează Comunicarea
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {loading && <p className="col-span-full text-center text-brand-accent animate-pulse uppercase tracking-[0.2em] py-20">Se preiau arhivele oficiale...</p>}
        {announcements?.length === 0 && <div className="col-span-full text-center py-40 border-2 border-dashed border-white/5 rounded-[64px] opacity-10 serif text-3xl italic">Niciun anunț înregistrat sub acest departament.</div>}
        {announcements?.map((a: any, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 1 }}
            key={a.id || idx}
            className="bg-card-bg border border-white/5 p-12 rounded-[64px] hover:border-brand-accent/20 transition-all duration-700 flex flex-col justify-between group relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <Megaphone size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent bg-brand-accent/5 px-6 py-2 rounded-full border border-brand-accent/10">Mesaj Oficial</span>
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="serif text-4xl leading-tight italic text-white mb-6 group-hover:translate-x-2 transition-transform duration-700">{a.title}</h3>
              <p className="text-white/40 text-xl font-light italic leading-relaxed mb-12 line-clamp-4 serif">{a.content}</p>
            </div>
            
            <div className="flex items-center gap-6 pt-10 border-t border-white/5 relative z-10">
              <div className="w-14 h-14 rounded-full bg-brand-accent/5 border border-brand-accent/10 flex items-center justify-center text-brand-accent shadow-inner">
                <UserCheck size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40">{a.authorName}</span>
                <span className="text-[8px] uppercase tracking-[0.4em] text-brand-accent/30 font-black italic">Cadru Didactic Autorizat</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TicketsView({ profile }: { profile: UserProfile }) {
  const ticketsQuery = React.useMemo(() => {
    if (profile.role === 'teacher') {
      return query(
        collection(db, 'tickets'),
        where('schoolCode', '==', profile.schoolCode),
        orderBy('createdAt', 'desc')
      );
    } else {
      return query(
        collection(db, 'tickets'),
        where('studentId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    }
  }, [profile.uid, profile.role, profile.schoolCode]);

  const [tickets, loading, error] = useCollectionData(ticketsQuery, { idField: 'id' } as any);
  const [isOpening, setIsOpening] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketSubject, setTicketSubject] = useState(SUBJECTS[0]);
  const [ticketContent, setTicketContent] = useState('');
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketTitle || !ticketContent) {
      alert("Te rugăm să completezi toate câmpurile.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'tickets'), {
        schoolCode: profile.schoolCode,
        studentId: profile.uid,
        studentName: profile.name,
        subject: ticketSubject,
        title: ticketTitle,
        content: ticketContent,
        status: 'open',
        createdAt: Date.now()
      });
      setTicketTitle('');
      setTicketContent('');
      setIsOpening(false);
      alert("Întrebarea ta a fost trimisă cu succes! Vei primi un răspuns în curând.");
    } catch (err: any) {
      console.error(err);
      alert("Eroare la trimiterea întrebării: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (e: FormEvent) => {
    e.preventDefault();
    if (!response || !respondingTo) {
      alert("Te rugăm să introduci un răspuns.");
      return;
    }
    
    if (!respondingTo.id) {
      alert("Eroare internă: ID-ul tichetului lipsește.");
      return;
    }

    setSubmitting(true);
    try {
      const ticketRef = doc(db, 'tickets', respondingTo.id);
      await updateDoc(ticketRef, {
        answer: response,
        answeredBy: profile.uid,
        answeredByName: profile.name,
        status: 'closed',
        updatedAt: Date.now()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: respondingTo.studentId,
        title: 'Răspuns la Întrebare',
        message: `Profesorul ${profile.name} a răspuns la întrebarea ta: "${respondingTo.title}"`,
        type: 'info',
        read: false,
        createdAt: Date.now()
      });

      setResponse('');
      setRespondingTo(null);
      alert("Răspuns trimis cu succes!");
    } catch (err: any) {
      console.error("Firestore Update Error:", err);
      alert("Eroare la trimiterea răspunsului: " + (err.message || "Eroare necunoscută"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Centru de Suport Academic</span>
           <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Asistență</h2>
        </div>
        {profile.role === 'student' && (
          <button 
            onClick={() => setIsOpening(!isOpening)}
            className="flex items-center gap-4 bg-brand-accent text-white px-10 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl shadow-brand-accent/20"
          >
            {isOpening ? 'Anulează' : 'Interoghează un Profesor'}
            <MessageSquare size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpening && profile.role === 'student' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <form onSubmit={handleOpenTicket} className="bg-card-bg border border-brand-accent/30 p-16 rounded-[64px] space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4 border-l-2 border-brand-accent/20 pl-8">
                   <span className="text-[9px] uppercase font-black tracking-widest text-brand-accent">Protocol Interogare</span>
                   <input 
                    value={ticketTitle}
                    onChange={e => setTicketTitle(e.target.value)}
                    placeholder="Subiectul nelămuririi..."
                    className="bg-transparent serif text-4xl italic text-white focus:outline-none w-full"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Departament / Disciplină</label>
                  <div className="relative">
                    <select 
                      value={ticketSubject}
                      onChange={e => setTicketSubject(e.target.value)}
                      className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-sm font-black uppercase tracking-widest text-white/60 focus:border-brand-accent/40 outline-none appearance-none cursor-pointer shadow-inner"
                    >
                      {SUBJECTS.map(s => <option key={s} value={s} className="bg-[#0A0A0C]">{s}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 text-brand-accent">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Contextualizare Problemă</label>
                <textarea 
                  value={ticketContent}
                  onChange={e => setTicketContent(e.target.value)}
                  placeholder="Explicați în detaliu aria unde doriți clarificări suplimentare..."
                  className="w-full bg-black/40 border border-white/5 rounded-[40px] p-10 text-white/70 font-light text-xl min-h-[200px] focus:border-brand-accent/40 outline-none transition-all shadow-inner italic serif resize-none"
                  required
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex items-center gap-4 bg-white text-black px-12 py-6 rounded-[24px] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-2xl disabled:opacity-20"
                >
                  {submitting ? 'Criptăm Mesajul...' : 'Transmite Spre Audit'}
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {loading && <p className="text-center text-brand-accent animate-pulse uppercase tracking-[0.2em] py-20">Audităm tichetele active...</p>}
        {tickets?.length === 0 && <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[64px] opacity-10 serif text-3xl italic">Nicio interogare activă sub acest protocol.</div>}
        {tickets?.map((t: any, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.8 }}
            key={t.id || idx}
            className={`bg-card-bg border ${t.status === 'open' ? 'border-brand-accent/20 shadow-[0_0_50px_rgba(10,63,122,0.1)]' : 'border-white/5'} p-12 rounded-[64px] overflow-hidden group transition-all duration-700 relative shadow-2xl`}
          >
            <div className="flex flex-col md:flex-row gap-16 relative z-10">
              <div className="flex-1 space-y-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-black uppercase tracking-[0.4em] px-6 py-2 rounded-full border ${t.status === 'open' ? 'bg-orange-500/5 text-orange-500 border-orange-500/10' : 'bg-brand-accent/5 text-brand-accent border-brand-accent/10'}`}>
                      {t.status === 'open' ? 'În Transit' : 'Validat'}
                    </span>
                    <div className="w-1.5 h-1.5 bg-white/10 rounded-full"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/20 italic">{t.subject}</span>
                  </div>
                  <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
                
                <div className="space-y-4">
                  <h3 className="serif text-5xl italic text-white leading-tight group-hover:translate-x-2 transition-transform duration-700">{t.title}</h3>
                  <p className="text-white/40 text-xl font-light italic leading-relaxed serif">{t.content}</p>
                </div>

                <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shadow-inner">
                    <UserIcon size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black tracking-[0.3em] text-white/10">Identitate Autor</span>
                    <span className="text-[10px] font-black italic serif text-white/60">{t.studentName}</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-2/5 bg-black/40 border border-white/5 p-10 rounded-[48px] flex flex-col justify-center relative shadow-inner">
                {t.status === 'closed' ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-px bg-brand-accent"></div>
                       <span className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent italic">Verdict Academic</span>
                    </div>
                    <p className="text-xl font-light leading-relaxed text-white/70 italic serif italic">"{t.answer}"</p>
                    <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                      <div className="w-10 h-10 rounded-2xl bg-brand-accent/5 flex items-center justify-center text-brand-accent/40 border border-brand-accent/10">
                        <UserCheck size={18} />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[9px] uppercase font-black tracking-widest text-white/10 italic">Evaluator</span>
                         <span className="text-[10px] font-black text-white/30">{t.answeredByName}</span>
                      </div>
                    </div>
                  </div>
                ) : profile.role === 'teacher' ? (
                  respondingTo?.id === t.id ? (
                    <form onSubmit={handleRespond} className="space-y-8">
                       <div className="space-y-4">
                          <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent">Redactare Răspuns</span>
                          <textarea 
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            placeholder="Introduceți analiza dvs. academică aici..."
                            className="w-full bg-transparent text-white/80 text-lg font-light leading-relaxed italic serif focus:outline-none min-h-[150px] resize-none"
                            required
                          />
                       </div>
                      <div className="flex gap-4">
                        <button 
                          type="submit" 
                          disabled={submitting}
                          className="flex-1 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-[20px] hover:bg-white hover:text-black transition-all duration-500 disabled:opacity-50 shadow-2xl"
                        >
                          {submitting ? 'Audit...' : 'Validează'}
                        </button>
                        <button 
                          type="button" 
                          disabled={submitting}
                          onClick={() => setRespondingTo(null)} 
                          className="flex-1 bg-white/5 text-white/20 text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-[20px] hover:text-white transition-all"
                        >
                          Anulează
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center space-y-8 py-6">
                      <div className="space-y-4 opacity-20">
                         <p className="text-[10px] uppercase font-black tracking-[0.5em] italic">Status Catalog</p>
                         <div className="w-16 h-px bg-white mx-auto"></div>
                         <p className="text-xs italic serif">Așteaptă audit academic</p>
                      </div>
                      <button 
                        onClick={() => { setRespondingTo(t); setResponse(''); }}
                        className="w-full bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] py-6 rounded-[28px] hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-2xl flex items-center justify-center gap-4"
                      >
                        Auditează Întrebarea
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )
                ) : (
                  <div className="text-center space-y-8 py-10 opacity-10">
                     <div className="w-20 h-20 rounded-full border-2 border-dashed border-white mx-auto flex items-center justify-center animate-spin-slow">
                        <Brain size={32} />
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] uppercase font-black tracking-[0.6em] italic leading-relaxed">Analiză G emini în curs<br/>Audit Profesor Pending</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ResourcesView({ profile }: { profile: UserProfile }) {
  const [selectedSub, setSelectedSub] = useState(profile.role === 'teacher' && profile.teacherSubject ? profile.teacherSubject : SUBJECTS[0]);
  const resourcesQuery = React.useMemo(() => query(
    collection(db, 'resources'),
    where('schoolCode', '==', profile.schoolCode),
    where('subject', '==', selectedSub),
    orderBy('createdAt', 'desc')
  ), [profile.schoolCode, selectedSub]);

  const [resources, loading, error] = useCollectionData(resourcesQuery, { idField: 'id' } as any);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitErrorMessage('');

    let finalUrl = url;
    let fileName = '';
    let fileType = '';

    if (uploadFile) {
      if (uploadFile.size > 900 * 1024) {
        setSubmitErrorMessage('Dimensiunea fișierului depășește limita de 900KB. Vă rugăm restrângeți fișierul sau folosiți un link extern (Google Drive, Dropbox etc.).');
        return;
      }
      try {
        finalUrl = await fileToBase64(uploadFile);
        fileName = uploadFile.name;
        fileType = uploadFile.type;
      } catch (err) {
        console.error("Error converting file to Base64:", err);
        setSubmitErrorMessage('Eroare la procesarea fișierului. Încercați din nou.');
        return;
      }
    }

    if (!finalUrl) {
      setSubmitErrorMessage('Vă rugăm să adăugați un fișier sau să specificați un URL.');
      return;
    }

    try {
      await addDoc(collection(db, 'resources'), {
        schoolCode: profile.schoolCode,
        subject: selectedSub,
        title,
        description,
        url: finalUrl,
        fileName,
        fileType,
        authorId: profile.uid,
        createdAt: Date.now()
      });
      setTitle('');
      setDescription('');
      setUrl('');
      setUploadFile(null);
      setSubmitErrorMessage('');
      setIsAdding(false);
    } catch (e: any) { 
      console.error(e); 
      setSubmitErrorMessage('A apărut o eroare la salvarea în baza de date: ' + (e.message || String(e)));
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setTitle(e.target.files[0].name.split('.')[0]);
    }
  };

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Biblioteca Digitală Lumi AI</span>
           <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Resurse Academice</h2>
        </div>
        {(profile.role === 'teacher' || profile.role === 'director') && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-4 bg-brand-accent text-white px-10 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl shadow-brand-accent/20"
          >
            {isAdding ? 'Închide Editor' : 'Adaugă Material'}
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 p-2 bg-black/40 rounded-[32px] border border-white/5 w-fit mx-auto md:mx-0">
        {SUBJECTS.map(s => (
          <button 
            key={s}
            onClick={() => setSelectedSub(s)}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${selectedSub === s ? 'bg-brand-accent text-white shadow-lg' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <form onSubmit={handleAdd} className="bg-card-bg border border-brand-accent/30 p-16 rounded-[64px] space-y-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4 border-l-2 border-brand-accent/20 pl-8">
                   <span className="text-[9px] uppercase font-black tracking-widest text-brand-accent">Identificativ Resursă</span>
                   <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titul Materialului..." className="bg-transparent serif text-4xl italic text-white focus:outline-none w-full" required />
                </div>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Încărcare de pe PC (PDF, Word, etc.)</label>
                    <div className="relative group/file">
                      <input 
                        type="file" 
                        onChange={onFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full bg-black/40 border border-white/10 border-dashed rounded-3xl p-6 flex items-center justify-center gap-4 group-hover/file:border-brand-accent/40 transition-all">
                        <Download size={18} className="text-brand-accent" />
                        <span className="text-xs text-white/40 italic serif">{uploadFile ? uploadFile.name : 'Selectează fișier...'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">SAU Punct Terminal (URI/URL)</label>
                    <input 
                      value={url} 
                      onChange={e => setUrl(e.target.value)} 
                      disabled={!!uploadFile}
                      placeholder={uploadFile ? "Fișier selectat prioritizat" : "Ex: drive.google.com/file/..."} 
                      className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-sm italic text-white/60 focus:border-brand-accent/40 outline-none transition-all shadow-inner disabled:opacity-20" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">Contextualizare Resursă</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrieți valoarea academică a acestui material..." className="w-full bg-black/40 border border-white/5 rounded-[40px] p-10 text-white/70 font-light text-xl min-h-[150px] focus:border-brand-accent/40 outline-none transition-all shadow-inner italic serif resize-none" />
              </div>

              {submitErrorMessage && (
                <div className="p-6 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm flex items-center gap-4">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{submitErrorMessage}</span>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-white text-black px-12 py-6 rounded-[24px] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-2xl">Arhivează în Bibliotecă</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {loading && <p className="col-span-full text-center text-brand-accent animate-pulse uppercase tracking-[0.2em] py-20">Sincronizăm bibliotecile digitale...</p>}
        {resources?.length === 0 && !loading && <div className="col-span-full text-center py-40 border-2 border-dashed border-white/5 rounded-[64px] opacity-10 serif text-3xl italic">Niciun material didactic înregistrat pentru {selectedSub}.</div>}
        {resources?.map((r, idx) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: idx * 0.05, duration: 0.8 }} 
            key={r.id} 
            className="bg-card-bg border border-white/5 p-12 rounded-[64px] hover:border-brand-accent/20 transition-all duration-700 group flex flex-col justify-between shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <FileText size={80} />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-[24px] bg-brand-accent/5 border border-brand-accent/10 flex items-center justify-center text-brand-accent mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner">
                <FolderOpen size={32} />
              </div>
              <h3 className="serif text-3xl italic text-white mb-4 group-hover:text-brand-accent transition-colors leading-tight">{r.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-1.5 h-1.5 bg-brand-accent rounded-full"></div>
                 <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20 italic">{r.subject}</p>
              </div>
              
              {r.fileName && (
                <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-brand-accent/5 border border-brand-accent/10 w-fit max-w-full">
                  <Download size={12} className="text-brand-accent shrink-0" />
                  <span className="text-[10px] font-mono text-brand-accent truncate max-w-[200px]" title={r.fileName}>
                    {r.fileName}
                  </span>
                </div>
              )}

              <p className="text-white/40 text-lg font-light leading-relaxed mb-12 line-clamp-3 italic serif">{r.description}</p>
            </div>
            
            {r.url?.startsWith('data:') ? (
              <a 
                href={r.url} 
                download={r.fileName || `${r.title}`} 
                className="flex items-center justify-between w-full bg-brand-accent/15 hover:bg-brand-accent border border-brand-accent/25 hover:border-transparent p-6 rounded-[24px] group/btn transition-all duration-500 relative z-10 scale-100 active:scale-95 cursor-pointer text-brand-accent hover:text-white"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors">Descarcă Fișierul</span>
                <Download size={16} className="group-hover/btn:translate-y-0.5 transition-transform duration-500" />
              </a>
            ) : r.url?.startsWith('Internal protocol:') ? (
              <button 
                type="button"
                onClick={() => alert(`Acest fișier vechi (${r.url.replace('Internal protocol: ', '')}) are format mock de test. Profesori: vă rugăm reîncărcați materialul din nou.`)}
                className="flex items-center justify-between w-full bg-red-500/10 border border-red-500/25 p-6 rounded-[24px] hover:bg-red-500/20 transition-all duration-500 relative z-10 text-red-400 text-[10px] font-black uppercase tracking-[0.3em] cursor-pointer"
              >
                <span>Format Mock Vechi</span>
                <AlertCircle size={16} />
              </button>
            ) : (
              <a 
                href={r.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between w-full bg-white/[0.03] hover:bg-brand-accent p-6 rounded-[24px] group/btn transition-all duration-500 border border-white/5 relative z-10 scale-100 active:scale-95 cursor-pointer text-white/80 hover:text-white"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors">Direcție Link Extern</span>
                <ChevronRight size={18} className="group-hover/btn:translate-x-1.5 transition-all duration-500" />
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProfileDetailsView({ profile }: { profile: UserProfile }) {
  const teacherResourcesQuery = profile.role === 'teacher' ? query(
    collection(db, 'resources'),
    where('authorId', '==', profile.uid),
    orderBy('createdAt', 'desc')
  ) : null;

  const teacherTicketsQuery = profile.role === 'teacher' ? query(
    collection(db, 'tickets'),
    where('answeredBy', '==', profile.uid)
  ) : null;

  const [teacherResources, loadingResources, resourceError] = useCollectionData(teacherResourcesQuery, { idField: 'id' } as any);
  const [answeredTickets] = useCollectionData(teacherTicketsQuery, { idField: 'id' } as any);

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Avatar & Identitate</span>
           <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Profilul Meu</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] flex flex-col items-center gap-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group border-t-brand-accent/20">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/5 to-transparent opacity-50"></div>
              <div className="relative group/avatar">
                <div className="w-56 h-56 rounded-full bg-zinc-900 border-[8px] border-white/5 flex items-center justify-center shadow-inner relative transition-transform duration-700 group-hover/avatar:scale-110">
                  <UserIcon size={96} className="text-white/10" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-3xl bg-brand-accent flex items-center justify-center text-white shadow-2xl z-10 scale-100 group-hover/avatar:scale-110 transition-transform">
                   {profile.role === 'teacher' ? <UserCheck size={28} /> : profile.role === 'director' ? <LayoutDashboard size={28} /> : <Trophy size={28} />}
                </div>
              </div>
              <div className="text-center space-y-4 relative z-10">
                <h3 className="serif text-5xl italic text-white leading-none tracking-tight">{profile.name}</h3>
                <div className="inline-block px-6 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                   <p className="text-brand-accent text-[10px] font-black uppercase tracking-[0.4em] italic">{profile.role === 'teacher' ? `PROFESOR ${profile.teacherSubject}` : profile.role === 'director' ? 'DIRECTOR INSTITUȚIE' : 'ELEV ÎNROLAT'}</p>
                </div>
              </div>
              
              <div className="w-full h-px bg-white/5 relative z-10"></div>

              <div className="w-full space-y-6 relative z-10">
                 <ProfileField label="Endpoint Email" value={profile.email} />
                 <ProfileField label="Cluster Instituțional" value={profile.schoolCode} color="text-brand-accent" />
                 <ProfileField label="Stampilă Protocol" value={new Date(profile.createdAt).toLocaleDateString()} />
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-16">
          {profile.role === 'teacher' && (
            <div className="space-y-12">
               <div className="flex items-center gap-6 border-l-2 border-brand-accent/20 pl-6">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent/40 italic">Panou Control</span>
                    <h3 className="serif text-5xl italic text-white">Statistici Activitate</h3>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] space-y-4 shadow-2xl relative overflow-hidden group">
                     <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Tichete Soluționate</span>
                     <p className="serif text-8xl italic text-brand-accent font-black tracking-tighter leading-none">{answeredTickets?.length || 0}</p>
                     <p className="text-[10px] uppercase tracking-widest text-white/10 font-bold">Protocol suport activ</p>
                  </div>
               </div>
            </div>
          )}

          {profile.role === 'student' && (
            <div className="space-y-12">
               <div className="flex items-center gap-6 border-l-2 border-brand-accent/20 pl-6">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-[0.4em] text-brand-accent/40 italic">Performanță Analitică</span>
                    <h3 className="serif text-5xl italic text-white">Statistici & Rang</h3>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] space-y-8 shadow-2xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-yellow-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Punctaj Merit Acumulat</span>
                     <p className="serif text-8xl italic text-yellow-500 font-black tracking-tighter leading-none">{profile.points.toLocaleString()}</p>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner relative">
                        <div className="h-full bg-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.6)]" style={{ width: `${Math.min(100, (profile.points / 10000) * 100)}%` }}></div>
                     </div>
                     <p className="text-[10px] uppercase tracking-widest text-white/10 font-bold">Target următor: {Math.ceil((profile.points + 1000) / 1000) * 1000} PTS</p>
                  </div>
                  <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] space-y-8 flex flex-col justify-center items-center text-center shadow-2xl group border-l-brand-accent/20 border-l-4">
                     <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Rang Curent Protocol</span>
                     <div className="text-brand-accent scale-150 py-10 group-hover:scale-[1.7] group-hover:rotate-12 transition-transform duration-700">
                        <GraduationCap size={64} />
                     </div>
                     <h4 className="serif text-5xl italic text-white">{getRank(profile.points).current.name}</h4>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value, color }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] group">
      <span className="text-white/20 group-hover:text-white/40 transition-colors">{label}</span>
      <span className={`${color || 'text-white/60'} font-mono normal-case tracking-normal text-[11px]`}>{value}</span>
    </div>
  );
}

function DirectorDashboard({ profile, schoolData }: { profile: UserProfile, schoolData?: any }) {
  const qUsers = useMemo(() => query(collection(db, 'users'), where('schoolCode', '==', profile.schoolCode)), [profile.schoolCode]);
  const [users, loadingUsers] = useCollectionData(qUsers, { idField: 'id' } as any);
  
  const qClasses = useMemo(() => query(collection(db, 'classes'), where('schoolCode', '==', profile.schoolCode)), [profile.schoolCode]);
  const [classes, loadingClasses] = useCollectionData(qClasses, { idField: 'id' } as any);

  const [analyzingTeacher, setAnalyzingTeacher] = useState<string | null>(null);
  const [teacherAnalysis, setTeacherAnalysis] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // States for special director dashboard actions
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditActive, setIsAuditActive] = useState(() => {
    return localStorage.getItem('lumi_audit_active') === 'true';
  });
  const [auditLogs, setAuditLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString('ro-RO')}] [SECURE] Filtrele antispam și antifraudă ale ierarhiei sunt active.`,
    `[${new Date().toLocaleTimeString('ro-RO')}] [SISTEM] Analiza bazată pe localDB este integrată și optimizată.`
  ]);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [generatingAiReport, setGeneratingAiReport] = useState(false);
  const [schoolAiReport, setSchoolAiReport] = useState<string | null>(null);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivingInProgress, setArchivingInProgress] = useState(false);
  const [pastArchives, setPastArchives] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('lumi_school_past_archives');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const teachers = users?.filter(u => u.role === 'teacher') || [];
  const students = users?.filter(u => u.role === 'student') || [];

  const toggleAuditMode = () => {
    const nextState = !isAuditActive;
    setIsAuditActive(nextState);
    localStorage.setItem('lumi_audit_active', nextState ? 'true' : 'false');
    
    const timestamp = new Date().toLocaleTimeString('ro-RO');
    const newLog = nextState 
      ? `[${timestamp}] [AUDIT] Directorul ${profile.name} a pornit protocolul militar de audit. Toate resursele sunt blocate în mod securizat.`
      : `[${timestamp}] [INFO] Protocolul de audit a fost deactivat. Activitate școlară normală reluată.`;
    
    setAuditLogs(prev => [newLog, ...prev]);
    window.dispatchEvent(new Event('audit_toggle'));
  };

  const handleGenerateSchoolAiReport = async () => {
    setGeneratingAiReport(true);
    setSchoolAiReport(null);
    setIsAiModalOpen(true);
    
    try {
      const topFive = [...students]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5)
        .map(s => ({ nume: s.name, puncte: s.points || 0 }));

      const res = await fetch('/api/analyze-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schoolCode: profile.schoolCode,
          studentsCount: students.length,
          teachersCount: teachers.length,
          classesCount: classes?.length || 0,
          totalPoints: students.reduce((acc, u) => acc + (u.points || 0), 0),
          topStudents: topFive
        })
      });

      if (!res.ok) {
        throw new Error('Sistemul a eșuat la interogarea serverului.');
      }

      const data = await res.json();
      setSchoolAiReport(data.analysis);
    } catch (err: any) {
      setSchoolAiReport(`⚠️ Eroare: Nu s-a putut conecta la serviciul Lumi AI. Motiv: ${err.message || 'Server overload'}. Vă rugăm reîncercați.`);
    } finally {
      setGeneratingAiReport(false);
    }
  };

  const downloadSchoolBackupJson = () => {
    const dataObj = {
      schoolCode: profile.schoolCode,
      exportDate: new Date().toISOString(),
      stats: {
        students: students.length,
        teachers: teachers.length,
        totalPoints: students.reduce((acc, u) => acc + (u.points || 0), 0),
        activeClasses: classes?.length || 0
      },
      teachers: teachers.map((t: any) => ({ name: t.name, email: t.email, subject: t.teacherSubject })),
      students: students.map((s: any) => ({ name: s.name, email: s.email, points: s.points })),
      classes: classes?.map((c: any) => ({ name: c.name, subject: c.subject, studentIds: c.studentIds }))
    };
    
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Catalog_Backup_${profile.schoolCode}_${new Date().toLocaleDateString('ro-RO')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSchoolPoints = async () => {
    if (!window.confirm("⚠️ ATENȚIE: Sunteti absolut sigur că doriți resetarea catalogului de puncte academic? Toți elevii vor începe noul semestru cu 0 puncte merit! Activitatea va fi păstrată în arhiva locală a directorului.")) {
      return;
    }
    setArchivingInProgress(true);
    try {
      // 1. Save current top students to archive history
      const topFive = [...students].sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0, 5).map(s => ({ name: s.name, points: s.points }));
      const newArchive = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toLocaleDateString('ro-RO'),
        totalPoints: students.reduce((acc, u) => acc + (u.points || 0), 0),
        studentsCount: students.length,
        topThree: topFive.slice(0, 3)
      };
      
      const updatedArchives = [newArchive, ...pastArchives];
      setPastArchives(updatedArchives);
      localStorage.setItem('lumi_school_past_archives', JSON.stringify(updatedArchives));

      // 2. Loop and set points to 0 for all students
      for (const student of students) {
        await setDoc(doc(db, 'users', student.uid), { points: 0 }, { merge: true });
      }

      // 3. Emit a general school notification / announcement
      await addDoc(collection(db, 'announcements'), {
        title: `[AN ȘCOLAR NOU] Resetare ierarhii academice`,
        message: `Directorul ${profile.name} a debutat un nou trimestru academic oficial! Punctajele au fost arhivate cu succes, iar catalogul a fost pornit cu ierarhii complet resetate. Mult succes tuturor elevilor!`,
        authorId: profile.uid,
        authorName: profile.name,
        schoolCode: profile.schoolCode,
        createdAt: serverTimestamp()
      });

      alert("Punctajele au fost resetate cu succes! O notificare oficială a fost trimisă tuturor elevilor și profesorilor din instituție.");
      setIsArchiveModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("A intervenit o eroare temporară la resetarea ierarhiilor.");
    } finally {
      setArchivingInProgress(false);
    }
  };

  const stats = {
    students: users?.filter(u => u.role === 'student').length || 0,
    teachers: users?.filter(u => u.role === 'teacher').length || 0,
    totalPoints: users?.reduce((acc, u) => acc + (u.points || 0), 0) || 0,
    activeClasses: classes?.length || 0
  };

  const handleAnalyzeTeacher = async (teacher: any) => {
    setAnalyzingTeacher(teacher.uid);
    setTeacherAnalysis(null);
    try {
      const teacherClasses = classes?.filter((c: any) => c.teacherId === teacher.uid) || [];
      const totalStudents = teacherClasses.reduce((acc, c: any) => acc + (c.studentIds?.length || 0), 0);
      const result = await analyzeTeacher(teacher.name, teacher.teacherSubject || 'Diverse', teacherClasses.length, totalStudents);
      setTeacherAnalysis(result.analysis);
    } catch (e) {
      alert("Eroare la analiza AI.");
    } finally {
      setAnalyzingTeacher(null);
    }
  };

  const exportReport = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('director-stats');
      if (!element) {
        alert("Eroare: Nu s-a putut localiza secțiunea de statistici.");
        setDownloadingPdf(false);
        return;
      }

      const canvas = await html2canvas(element, { 
        backgroundColor: '#050505',
        scale: 2,
        logging: false,
        onclone: (clonedDoc) => {
          try {
            const elWin = clonedDoc.defaultView || window;
            const allElements = clonedDoc.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              if (!el || !el.style) continue;
              
              const styles = elWin.getComputedStyle(el);
              const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'fill', 'stroke'];
              
              for (const prop of colorProps) {
                const val = styles[prop as any];
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  let fallbackColor = 'rgb(255, 255, 255)';
                  
                  if (val.includes('/')) {
                    const parts = val.split('/');
                    const opacity = parseFloat(parts[1]);
                    if (!isNaN(opacity)) {
                      fallbackColor = `rgba(255, 255, 255, ${opacity})`;
                    }
                  }
                  
                  if (prop === 'backgroundColor') {
                    if (el.className && (el.className.includes('bg-[#0A0A0C]') || el.className.includes('bg-[#121216]') || el.className.includes('bg-[#050505]') || el.className.includes('bg-card-bg') || el.className.includes('bg-[#090909]'))) {
                      fallbackColor = '#0a0a0c';
                    } else if (el.className && el.className.includes('bg-brand-accent')) {
                      fallbackColor = '#0A3F7A';
                    } else if (val.includes('/') && parseFloat(val.split('/')[1]) < 0.2) {
                      fallbackColor = `rgba(18, 18, 22, ${parseFloat(val.split('/')[1])})`;
                    }
                  } else if (prop === 'color') {
                    if (el.className && el.className.includes('text-brand-accent')) {
                      fallbackColor = '#0A3F7A';
                    } else if (el.className && el.className.includes('text-emerald')) {
                      fallbackColor = '#10B981';
                    } else if (el.className && el.className.includes('text-yellow')) {
                      fallbackColor = '#F59E0B';
                    } else if (el.className && el.className.includes('text-red')) {
                      fallbackColor = '#EF4444';
                    } else {
                      if (val.includes('/')) {
                        const opacity = parseFloat(val.split('/')[1]);
                        fallbackColor = `rgba(226, 226, 226, ${opacity})`;
                      } else {
                        fallbackColor = '#E2E2E2';
                      }
                    }
                  }
                  
                  el.style.setProperty(prop, fallbackColor, 'important');
                }
              }
            }
          } catch (cloneErr) {
            console.warn("Eroare la maparea stilurilor de clonare PDF:", cloneErr);
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Raport_Audit_Them_${new Date().toLocaleDateString('ro-RO').replace(/\//g, '-')}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("A apărut o eroare la generarea fișierului PDF: " + (err.message || err));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const emitAnnouncement = async () => {
    const title = prompt('Titlu Circulară:');
    const message = prompt('Mesaj Circulară:');
    if (title && message) {
      await addDoc(collection(db, 'announcements'), {
        title: `[CIRCULARĂ DIRECTOR] ${title}`,
        message,
        authorId: profile.uid,
        authorName: profile.name,
        schoolCode: profile.schoolCode,
        createdAt: serverTimestamp()
      });
      alert('Circulară emisă cu succes către toți utilizatorii.');
    }
  };

  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-1000" id="director-report">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
        <div className="space-y-4">
           <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Autoritate & Management Instituțional</span>
           <h2 className="serif text-5xl md:text-7xl italic text-white leading-none tracking-tighter">Salut, {profile.name}</h2>
         </div>
        <div className="flex gap-4">
          <button 
            onClick={emitAnnouncement}
            className="flex items-center gap-4 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-8 py-5 rounded-[24px] font-black uppercase text-[9px] tracking-[0.3em] hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-2xl group"
          >
            Emite Circulară
            <Megaphone size={16} />
          </button>
        </div>
      </div>

      <div id="director-stats" className="space-y-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <StatCard label="Efectiv Elevi" value={stats.students} icon={<GraduationCap size={24} />} color="text-white" />
          <StatCard label="Corp Profesoral" value={stats.teachers} icon={<UserCheck size={24} />} color="text-brand-accent" />
          <StatCard label="Nuclee de Studiu" value={stats.activeClasses} icon={<SchoolIcon size={24} />} color="text-white/40" />
          <StatCard label="Merit Academic" value={stats.totalPoints.toLocaleString()} icon={<Trophy size={24} />} color="text-yellow-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">
            {/* Teachers List */}
            <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-brand-accent/[0.01] pointer-events-none"></div>
              <div className="flex justify-between items-end mb-12 px-4">
                 <div className="space-y-2">
                    <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent/40 block">Management Resurse Umane</span>
                    <h3 className="serif text-4xl italic text-white leading-none">Catalog Profesori</h3>
                 </div>
                 <span className="text-[10px] font-mono text-white/10 uppercase tracking-widest">{teachers.length} ACTIVE CLUSTER</span>
              </div>
              <div className="space-y-4">
                {teachers.length === 0 ? (
                  <p className="text-white/20 italic p-12 text-center serif text-xl">Niciun profesor înregistrat în cluster.</p>
                ) : (
                  teachers.map((teacher: any) => (
                    <div key={teacher.uid} className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.05] transition-all group/teacher">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent font-black serif italic text-xl">
                          {teacher.name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-white font-bold leading-tight">{teacher.name}</h4>
                          <p className="text-[9px] uppercase tracking-widest text-white/30 font-black mt-1 italic">{teacher.teacherSubject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="text-right">
                          <span className="text-[8px] uppercase tracking-widest text-white/10 block font-bold">Email Protocol</span>
                          <span className="text-[11px] font-mono text-white/40">{teacher.email}</span>
                        </div>
                        <button 
                          onClick={() => handleAnalyzeTeacher(teacher)}
                          disabled={analyzingTeacher === teacher.uid}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${analyzingTeacher === teacher.uid ? 'bg-brand-accent animate-spin text-white' : 'bg-white/5 text-white/20 hover:bg-brand-accent hover:text-white'}`}
                        >
                          <Brain size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {teacherAnalysis && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card-bg border border-brand-accent/20 p-12 rounded-[64px] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent"></div>
                <div className="flex justify-between items-center mb-8">
                  <h4 className="serif text-3xl italic text-white flex items-center gap-4">
                    <Brain className="text-brand-accent" /> Audit Performanță AI
                  </h4>
                  <button onClick={() => setTeacherAnalysis(null)} className="text-white/20 hover:text-white"><X size={20} /></button>
                </div>
                <div className="prose prose-invert max-w-none text-white/70 italic serif leading-relaxed">
                  {teacherAnalysis}
                </div>
              </motion.div>
            )}

            {/* Classes Inventory List */}
            <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] shadow-2xl relative overflow-hidden group">
               <div className="flex justify-between items-end mb-12 px-4">
                  <div className="space-y-2">
                     <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent/40 block">Inventar Instituțional</span>
                     <h3 className="serif text-4xl italic text-white leading-none">Catalog Clase Active</h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/10 uppercase tracking-widest">{classes?.length || 0} MODULES</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {classes?.length === 0 ? (
                   <p className="text-white/20 italic p-12 text-center serif text-xl col-span-2">Nicio clasă activă raportată.</p>
                 ) : (
                   classes?.map((c: any) => (
                     <div key={c.id} className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] hover:bg-white/[0.05] transition-all">
                       <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent italic mb-2 block">{c.subject}</span>
                       <h4 className="serif text-2xl italic text-white mb-6 leading-tight">{c.name}</h4>
                       <div className="flex justify-between items-center pt-6 border-t border-white/5">
                          <div className="flex flex-col">
                             <span className="text-[8px] uppercase tracking-widest text-white/10 font-bold">Profesor</span>
                             <span className="text-[11px] text-white/60">{c.teacherName || 'Atribuit'}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-[8px] uppercase tracking-widest text-white/10 font-bold block">Elevi</span>
                             <span className="text-xs text-brand-accent font-black serif italic">{c.studentIds?.length || 0}</span>
                          </div>
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>

            {/* Students Activity Summary */}
            <div className="bg-card-bg border border-white/5 p-12 rounded-[64px] shadow-2xl relative overflow-hidden group">
               <div className="flex justify-between items-end mb-12 px-4">
                 <div className="space-y-2">
                    <span className="text-[9px] uppercase font-black tracking-[0.4em] text-brand-accent/40 block">Monitorizare Performanță</span>
                    <h3 className="serif text-4xl italic text-white leading-none">Top Performanță Elevi</h3>
                 </div>
              </div>
              <div className="space-y-4">
                {students.sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0, 5).map((student: any, idx) => (
                  <div key={student.uid} className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl font-black text-white/10 serif italic w-8 text-center">#0{idx+1}</span>
                      <div>
                        <h4 className="text-white font-bold">{student.name}</h4>
                        <p className="text-[9px] uppercase tracking-widest text-white/30 font-black mt-1">{getRank(student.points).current.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-2xl font-black text-brand-accent serif italic">{student.points?.toLocaleString()}</span>
                       <span className="text-[9px] uppercase tracking-tighter text-white/10 font-bold block">Merit Points</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-12">
            <div className="bg-card-bg border border-white/5 p-16 rounded-[64px] space-y-12 shadow-2xl border-t-brand-accent/20">
              <h3 className="serif text-4xl italic text-white">Consolă Executivă</h3>
              <div className="space-y-6">
                <DirectorAction 
                  label={isAuditActive ? "Oprește Modul Audit (Activ)" : "Activare Protocol Audit"} 
                  icon={<AlertCircle size={18} className={isAuditActive ? "text-red-500 animate-pulse" : ""} />} 
                  onClick={() => setIsAuditModalOpen(true)} 
                />
                <DirectorAction 
                  label="Raport General Gemini AI" 
                  icon={<Brain size={18} />} 
                  onClick={handleGenerateSchoolAiReport} 
                />
                <DirectorAction 
                  label="Management de Arhivare" 
                  icon={<FolderOpen size={18} />} 
                  onClick={() => setIsArchiveModalOpen(true)} 
                />
              </div>
            </div>

            <div className={`bg-card-bg border p-12 rounded-[56px] space-y-8 shadow-2xl relative overflow-hidden group transition-all duration-500 ${isAuditActive ? 'border-red-500/20' : 'border-white/5'}`}>
               <div className="absolute inset-0 bg-brand-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white/20 italic block">Stare Sistem Academic</span>
               <div className="flex items-center gap-6">
                  <div className={`w-4 h-4 rounded-full ${isAuditActive ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]'} animate-pulse`}></div>
                  <span className="text-white font-bold text-xl serif italic">
                    {isAuditActive ? 'Protocol Securizat Audit Activ' : 'Protocol Activ Standard'}
                  </span>
               </div>
               <p className="text-white/30 text-[10px] leading-relaxed italic serif tracking-wide">
                 {isAuditActive 
                   ? 'Filtrele de corectitudine academică sunt forțate la nivel de server. Toată activitatea utilizatorilor (teme și quiz) este auditată constant.'
                   : 'Toate conexiunile sunt stabile. Managementul academic decurge conform normelor stabilite de director.'}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card-bg border border-white/5 rounded-[64px] overflow-hidden shadow-2xl">
        <div className="px-16 py-12 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div className="space-y-1">
             <span className="text-[10px] uppercase font-black tracking-[0.5em] text-brand-accent italic">Bază de Date Instituțională</span>
             <h3 className="serif text-4xl italic text-white">Director Complet Membri</h3>
          </div>
          <div className="flex items-center gap-4 text-white/10 text-[9px] uppercase font-black tracking-widest">
             <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
             Live Audit Mode
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-16 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30">Membru</th>
                <th className="px-16 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30">Protocol Rol</th>
                <th className="px-16 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30">Status Academic</th>
                <th className="px-16 py-8 text-[10px] uppercase font-black tracking-[0.4em] text-white/30 text-right">Punctaj Merit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingUsers && <tr><td colSpan={4} className="px-16 py-32 text-center text-brand-accent animate-pulse serif text-2xl italic">Sincronizăm ierarhia...</td></tr>}
              {users?.map((u: any) => (
                <tr key={u.uid} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-16 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:bg-brand-accent group-hover:text-white transition-all">
                        <UserIcon size={20} />
                      </div>
                      <span className="serif italic text-2xl text-white/80 group-hover:text-white transition-colors">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-16 py-8">
                    <span className={`text-[9px] px-6 py-2 rounded-full font-black uppercase tracking-[0.3em] border transition-all ${
                      u.role === 'director' ? 'bg-yellow-500/5 text-yellow-500 border-yellow-500/10' : 
                      u.role === 'teacher' ? 'bg-brand-accent/5 text-brand-accent border-brand-accent/10' : 
                      'bg-white/5 text-white/20 border-white/5'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-16 py-8 text-lg text-white/30 font-light italic serif italic">
                    {u.role === 'teacher' ? u.teacherSubject : u.role === 'student' ? getRank(u.points).current.name : 'Administrație'}
                  </td>
                  <td className="px-16 py-8 font-mono text-brand-accent font-black text-2xl text-right tracking-tighter">{u.points?.toLocaleString() || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS SECTION */}
      <AnimatePresence>
        {/* Modal AUDIT */}
        {isAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl bg-[#090909] border border-white/10 p-12 rounded-[48px] shadow-2xl overflow-hidden text-white"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black tracking-[0.5em] text-red-500 block">SISTEM DE COMPLIANȚĂ</span>
                  <h3 className="serif text-4xl italic">Consolă Siguranță & Audit</h3>
                </div>
                <button 
                  onClick={() => setIsAuditModalOpen(false)} 
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h4 className="serif text-xl italic font-bold">Mod Academic Monitorizare Activă</h4>
                    <p className="text-[11px] text-white/50 leading-relaxed max-w-md">
                      Activarea acestei opțiuni suspendă modificările neauditate și marchează profilele pentru inspecție de siguranță. Perfect pentru supraveghere teze și teste.
                    </p>
                  </div>
                  <button 
                    onClick={toggleAuditMode}
                    className={`px-6 py-4 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${
                      isAuditActive 
                        ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                        : 'bg-white/10 text-white/70 hover:bg-white hover:text-black'
                    }`}
                  >
                    {isAuditActive ? "ACTIVAT" : "DEZACTIVAT"}
                  </button>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white/30 block">Live Compliance Status Checklist</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Criptare Baze localDB</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isAuditActive ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`}></div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Sincronizare Forțată AI</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Anti-Spam Homework</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Protocol GDPR v4</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white/30 block">Log-uri Consolă Securitate</span>
                  <div className="bg-black border border-white/5 p-6 rounded-[24px] h-32 overflow-y-auto font-mono text-[10px] leading-relaxed text-red-400 space-y-2">
                    {auditLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal RAPORT STRATEGIC GEMINI */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl bg-[#090909] border border-white/10 p-12 rounded-[48px] shadow-2xl text-white"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent"></div>
              
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black tracking-[0.5em] text-brand-accent block">RAPORT PRIVILEGIAT AUDIT STRATEGIC</span>
                  <h3 className="serif text-4xl italic flex items-center gap-3">
                    <Brain className="text-brand-accent animate-pulse" /> Diagnostic Academic Lumi AI
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(false)} 
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {generatingAiReport ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-6">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-brand-accent/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-bold text-white text-xl animate-pulse">Se analizează baza de date academică...</p>
                      <p className="text-[11px] font-mono text-white/40 tracking-wider uppercase">Lumi AI procesează ierarhia meritului, catalogul de clase și profesorii activi în cluster</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="max-h-96 overflow-y-auto pr-4 space-y-6 prose prose-invert max-w-none text-white/80 leading-relaxed font-light italic serif text-sm whitespace-pre-wrap theme-scrollbar">
                      {schoolAiReport}
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                      <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-brand-accent hover:text-white transition-all duration-300"
                      >
                        <Download size={14} /> Tipărește Raport
                      </button>
                      <button 
                        onClick={() => setIsAiModalOpen(false)}
                        className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Închide Consola
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal ARHIVARE & AN ȘCOLAR NOU */}
        {isArchiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsArchiveModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl bg-[#090909] border border-white/10 p-12 rounded-[48px] shadow-2xl text-white"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
              
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black tracking-[0.5em] text-yellow-500 block">DEPARTAMENTUL DE MERIT ȘI DISTINCȚII</span>
                  <h3 className="serif text-4xl italic">Arhivare An Școlar & Premii</h3>
                </div>
                <button 
                  onClick={() => setIsArchiveModalOpen(false)} 
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-8 rounded-[32px] bg-yellow-500/5 border border-yellow-500/10 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[8px] uppercase tracking-widest font-black text-yellow-500/60 font-mono">DIPLOMA CATALOG DE MERIT</span>
                    <h4 className="serif text-2xl italic font-bold">Proiect de Premii Academic Actual</h4>
                  </div>
                  
                  {students.length === 0 ? (
                    <p className="text-[11px] text-white/45 italic serif">Nu există elevi înregistrați pentru acordarea distincțiilor de merit.</p>
                  ) : (
                    <div className="space-y-3">
                      {students.sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0, 3).map((student: any, i) => (
                        <div key={student.uid} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm italic serif">
                          <span className="flex items-center gap-4 text-white/80">
                            <span className="text-xs font-black font-mono text-yellow-500">
                              {i === 0 ? "🥇 PREMIUL I" : i === 1 ? "🥈 PREMIUL II" : "🥉 PREMIUL III"}
                            </span>
                            {student.name}
                          </span>
                          <span className="font-mono text-brand-accent font-black">{student.points?.toLocaleString() || 0} puncte</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={downloadSchoolBackupJson}
                    className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[24px] hover:bg-white hover:text-black transition-all group gap-2"
                  >
                    <Download size={20} className="text-brand-accent group-hover:text-black" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Backup Catalog (JSON)</span>
                  </button>
                  <button 
                    onClick={handleResetSchoolPoints}
                    disabled={archivingInProgress}
                    className="flex flex-col items-center justify-center p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-[24px] hover:bg-yellow-500 hover:text-black transition-all group gap-2"
                  >
                    <FolderOpen size={20} className="text-yellow-500 group-hover:text-black" />
                    <span className="text-[10px] uppercase font-black tracking-widest">
                      {archivingInProgress ? "Se procesează..." : "Start An Școlar Nou"}
                    </span>
                  </button>
                </div>

                {pastArchives.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white/30 block">Arhive Semestre Anterioare Păstrate</span>
                    <div className="bg-white/[0.01] border border-white/5 p-6 rounded-[24px] max-h-32 overflow-y-auto gap-3 flex flex-col font-mono text-[10px]">
                      {pastArchives.map((archive, i) => (
                        <div key={archive.id || i} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-none">
                          <span className="text-yellow-500/80">📅 Arhivă din {archive.date}</span>
                          <span className="text-white/40">Total Pcte: {archive.totalPoints}</span>
                          <span className="text-white/60">Top Performer: {archive.topThree?.[0]?.name || "N/A"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: any, color: string }) {
  return (
    <div className="bg-card-bg border border-white/5 p-8 rounded-[40px] space-y-4 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
        {React.cloneElement(icon, { size: 120 })}
      </div>
      <span className="text-[10px] uppercase tracking-widest opacity-30 font-bold block">{label}</span>
      <p className={`serif text-5xl italic ${color}`}>{value}</p>
    </div>
  );
}

function DirectorAction({ label, icon, onClick }: { label: string, icon: any, onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white hover:text-black transition-all group">
      <div className="text-brand-accent group-hover:text-black">{icon}</div>
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
      <ChevronRight size={14} className="ml-auto opacity-20 group-hover:opacity-100" />
    </button>
  );
}

function RewardsView({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-l border-white/10 pl-10">
          <div className="space-y-4">
             <span className="text-[10px] uppercase font-black tracking-[0.6em] text-brand-accent italic">Ierarhie Academică</span>
             <h2 className="serif text-6xl md:text-8xl italic text-white leading-none tracking-tighter">Sistemul de Ranguri</h2>
          </div>
          <div className="bg-brand-accent/5 px-10 py-6 rounded-[32px] border border-brand-accent/10 flex flex-col items-center shadow-inner group relative overflow-hidden">
             <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2 relative z-10 italic">Merit Points Acumulat</span>
             <span className="text-4xl font-black italic serif text-white tracking-tighter relative z-10">{profile.points.toLocaleString()} <span className="text-[10px] opacity-20">PTS</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {RANKS.map((rank, i) => {
            const isUnlocked = profile.points >= rank.minPoints;
            const isCurrent = getRank(profile.points).current.name === rank.name;
            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={rank.name} 
                className={`p-10 rounded-[54px] border transition-all duration-700 relative overflow-hidden group ${isUnlocked ? 'bg-card-bg border-brand-accent/20 shadow-2xl' : 'bg-black/20 border-white/5 opacity-20 filter grayscale'}`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center shadow-inner ${isUnlocked ? 'bg-brand-accent/10 text-brand-accent' : 'bg-white/5 text-white/20'}`}>
                    <Trophy size={28} />
                  </div>
                  {isCurrent && (
                    <motion.span 
                      layoutId="current-rank"
                      className="text-[9px] bg-brand-accent text-white px-5 py-2 rounded-full font-black uppercase tracking-widest shadow-[0_0_20px_rgba(10,63,122,0.4)]"
                    >
                      Rang Curent
                    </motion.span>
                  )}
                </div>
                <h4 className="serif text-4xl italic mb-2 tracking-tight group-hover:translate-x-1 transition-transform" style={{ color: isUnlocked ? rank.color : 'inherit' }}>{rank.name}</h4>
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20 mb-6 italic">Peste {rank.minPoints} Merit Points</p>
                <p className="text-base text-white/40 font-light leading-relaxed italic serif">
                  {isUnlocked ? 'Protocolul tău de statut academic este activat.' : 'Continuă ascensiunea academică pentru validarea acestui stagiu.'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LogOutIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
