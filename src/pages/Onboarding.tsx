"use client";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Sparkles, Check, ChevronRight, User, 
  Calendar, Lock, Globe, Users, Loader2, Image as ImageIcon,
  Dna
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/contexts/LanguageContext";

// Step Enums
enum Step {
  IDENTITY = 0,
  DOB = 1,
  AVATAR = 2,
  PRIVACY = 3,
  COMPLETION = 4
}

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(Step.IDENTITY);
  const [playfulMode, setPlayfulMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  // DOB State
  const [day, setDay] = useState<number>(15);
  const [month, setMonth] = useState<number>(6);
  const [year, setYear] = useState<number>(2000);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Privacy State
  const [privacy, setPrivacy] = useState<"private" | "connections" | "public">("private");

  const STEP_LABELS = [
    { id: Step.IDENTITY, label: t("onboarding.tabIdentity"), icon: User },
    { id: Step.DOB, label: t("onboarding.tabOrigin"), icon: Calendar },
    { id: Step.AVATAR, label: t("onboarding.tabVisage"), icon: ImageIcon },
    { id: Step.PRIVACY, label: t("onboarding.tabControl"), icon: Lock },
    { id: Step.COMPLETION, label: t("onboarding.tabFuture"), icon: Sparkles }
  ];

  const getMonthName = (idx: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const key = `months.${months[idx].toLowerCase()}`;
    const trans = t(key);
    return trans === key ? months[idx] : trans;
  };

  // Load existing user data if any
  useEffect(() => {
    const loadUser = async () => {
      if (auth.currentUser) {
        setName(auth.currentUser.displayName || "");
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.username) setUsername(data.username);
          if (data.bio) setBio(data.bio);
          if (data.photoURL) setAvatarUrl(data.photoURL);
          if (data.privacyLevel) setPrivacy(data.privacyLevel);
        }
      }
    };
    loadUser();
  }, []);

  // Username checking mock
  useEffect(() => {
    if (username.length > 2) {
      // Mock network check
      const timer = setTimeout(() => {
        setUsernameAvailable(username.toLowerCase() !== "admin");
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [username]);

  const handleNext = () => {
    if (currentStep < Step.COMPLETION) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setCurrentStep(Step.COMPLETION);
    
    // Format DOB (needed in both try and fallback)
    const dobStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let onboardingSaved = false;
    try {
      if (!auth.currentUser) throw new Error("No user logged in");

      // Update Firebase Auth profile (displayName / photoURL)
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatarUrl || auth.currentUser.photoURL
      });

      // Save profile data through server-side validated endpoint
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_BASE}/saveOnboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          username: username || name.split(' ')[0].toLowerCase(),
          bio,
          dateOfBirth: dobStr,
          photoURL: avatarUrl || "",
          privacyLevel: privacy,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to save profile: ${response.status}`);
      }

      onboardingSaved = true;

    } catch (error) {
      console.warn("Error saving onboarding data via function, trying Firestore fallback:", error);
      try {
        if (!auth.currentUser) throw new Error("No user logged in");
        await setDoc(doc(db, "users", auth.currentUser.uid), {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || "",
          name,
          username: username || name.split(' ')[0].toLowerCase(),
          bio,
          dateOfBirth: dobStr,
          photoURL: avatarUrl || "",
          privacyLevel: privacy,
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        onboardingSaved = true;
      } catch (fallbackError) {
        console.error("Error saving onboarding data via Firestore fallback:", fallbackError);
        setIsSubmitting(false);
        return;
      }
    }

    if (onboardingSaved) {
      setTimeout(() => {
        navigate("/dashboard");
      }, 3500);
      return;
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring" as any, stiffness: 300, damping: 30 }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    })
  };

  const direction = 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Playful Mode Toggle (Easter Egg) */}
      <button 
        onClick={() => setPlayfulMode(!playfulMode)}
        className={`absolute top-6 right-6 p-2 rounded-full border transition-all ${playfulMode ? 'border-primary text-primary bg-primary/10 shadow-glow' : 'border-border text-muted-foreground bg-surface'}`}
        title="Toggle Playful Mode"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Ambient background styling */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Progress Bar */}
      {currentStep < Step.COMPLETION && (
        <div className="w-full max-w-2xl mb-8 z-10 flex items-center justify-between relative px-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-10 transition-all duration-500 ease-in-out" 
            style={{ width: `${(currentStep / (STEP_LABELS.length - 2)) * 100}%` }}
          />
          {STEP_LABELS.map((step, idx) => {
            if (idx === Step.COMPLETION) return null;
            const isActive = currentStep === step.id;
            const isPast = currentStep > step.id;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'border-primary bg-primary/20 text-primary shadow-glow scale-110' : isPast ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted-foreground'}`}>
                  {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          
          {/* STEP 1: IDENTITY */}
          {currentStep === Step.IDENTITY && (
            <motion.div
              key="step1"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-heading font-bold">
                  {playfulMode ? t("onboarding.identityTitlePlayful") : t("onboarding.identityTitleNormal")}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? t("onboarding.identityDescPlayful") : t("onboarding.identityDescNormal")}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">{t("onboarding.fullNameLabel")}</label>
                  <Input 
                    placeholder={t("onboarding.fullNamePlaceholder")} 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="bg-input/50 border-border h-12 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground ml-1">{t("onboarding.usernameLabel")}</label>
                  <p className="text-xs text-muted-foreground ml-1 mb-2">
                    {playfulMode ? t("onboarding.usernameDescPlayful") : t("onboarding.usernameDescNormal")}
                  </p>
                  <Input 
                    placeholder={t("onboarding.usernamePlaceholder")} 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    className={`bg-input/50 border-border h-12 rounded-xl focus-visible:ring-primary ${usernameAvailable === false ? 'border-destructive focus-visible:ring-destructive' : usernameAvailable === true ? 'border-success focus-visible:ring-success' : ''}`}
                  />
                  {username.length > 2 && usernameAvailable === true && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                      <Check className="w-3 h-3"/> {playfulMode ? t("onboarding.usernameAvailablePlayful") : t("onboarding.usernameAvailableNormal")}
                    </p>
                  )}
                  {username.length > 2 && usernameAvailable === false && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                      {t("onboarding.usernameTaken")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground ml-1">{t("onboarding.bioLabel")}</label>
                    <button 
                      onClick={() => {
                        const localPrompts = [
                          t("onboarding.bioPrompt1"),
                          t("onboarding.bioPrompt2"),
                          t("onboarding.bioPrompt3"),
                          t("onboarding.bioPrompt4"),
                          t("onboarding.bioPrompt5")
                        ];
                        setBio(localPrompts[Math.floor(Math.random() * localPrompts.length)]);
                      }}
                      className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> {t("onboarding.bioHelp")}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground ml-1 mb-2">
                    {playfulMode ? t("onboarding.bioDescPlayful") : t("onboarding.bioDescNormal")}
                  </p>
                  <textarea 
                    placeholder={t("onboarding.bioPlaceholder")}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-input/50 border border-border text-foreground rounded-xl p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground text-sm"
                  />
                  {bio.length === 0 && playfulMode && (
                    <p className="text-xs text-muted-foreground italic text-center mt-2">{t("onboarding.bioEmptyPlayful")}</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleNext} 
                disabled={!name || !username || usernameAvailable === false}
                className="w-full h-12 rounded-xl text-md font-medium shadow-glow"
              >
                {t("onboarding.continue")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: DOB */}
          {currentStep === Step.DOB && (
            <motion.div
              key="step2"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8 space-y-8 flex flex-col items-center"
            >
              <div className="text-center space-y-2 w-full">
                <h2 className="text-2xl md:text-3xl font-heading font-bold">
                  {playfulMode ? t("onboarding.dobTitlePlayful") : t("onboarding.dobTitleNormal")}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? t("onboarding.dobDescPlayful") : t("onboarding.dobDescNormal")}
                </p>
              </div>

              {/* Scroll Wheel Picker Simulation */}
              <div className="w-full max-w-sm h-64 bg-input/30 rounded-2xl border border-border relative overflow-hidden flex items-center justify-center p-4">
                
                {/* Selection Highlight */}
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-12 bg-primary/10 border-y border-primary/20 pointer-events-none z-10" />

                <div className="flex w-full gap-4 relative z-20 h-full">
                  <ScrollColumn 
                    items={Array.from({length: 31}, (_, i) => i + 1)} 
                    selected={day} 
                    onChange={setDay} 
                    label={t("onboarding.dayLabel")}
                  />
                  <ScrollColumn 
                    items={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']} 
                    selected={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} 
                    onChange={(val: string) => setMonth(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(val) + 1)} 
                    valueDisplay={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]}
                    displayMapper={(item: string) => {
                      const idx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(item);
                      return getMonthName(idx);
                    }}
                    label={t("onboarding.monthLabel")}
                  />
                  <ScrollColumn 
                    items={Array.from({length: 100}, (_, i) => new Date().getFullYear() - i)} 
                    selected={year} 
                    onChange={setYear} 
                    label={t("onboarding.yearLabel")}
                  />
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.IDENTITY)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  {t("onboarding.back")}
                </Button>
                <Button onClick={handleNext} className="h-12 rounded-xl flex-[2] font-medium shadow-glow">
                  {t("onboarding.continue")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: AVATAR */}
          {currentStep === Step.AVATAR && (
            <motion.div
              key="step3"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-heading font-bold">
                  {playfulMode ? t("onboarding.avatarTitlePlayful") : t("onboarding.avatarTitleNormal")}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? t("onboarding.avatarDescPlayful") : t("onboarding.avatarDescNormal")}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-surface bg-input/50 overflow-hidden relative shadow-lg shadow-black/20 flex items-center justify-center transition-all group-hover:border-primary/50">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {playfulMode && !avatarUrl && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center px-4"
                    >
                      <p className="text-sm text-muted-foreground">{t("onboarding.avatarHint")}</p>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.DOB)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  {t("onboarding.back")}
                </Button>
                <Button onClick={() => setCurrentStep(Step.PRIVACY)} className="h-12 rounded-xl flex-[2] font-medium shadow-glow">
                  {t("onboarding.continue")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PRIVACY */}
          {currentStep === Step.PRIVACY && (
            <motion.div
              key="step4"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8 space-y-8 flex flex-col"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-heading font-bold">{t("onboarding.privacyTitle")}</h2>
                <p className="text-muted-foreground">{t("onboarding.privacyDesc")}</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="radio" checked={privacy === 'private'} onChange={() => setPrivacy('private')} />
                  <span className="ml-2">{t('onboarding.privacyPrivate')}</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" checked={privacy === 'connections'} onChange={() => setPrivacy('connections')} />
                  <span className="ml-2">{t('onboarding.privacyConnections')}</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" checked={privacy === 'public'} onChange={() => setPrivacy('public')} />
                  <span className="ml-2">{t('onboarding.privacyPublic')}</span>
                </label>
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.AVATAR)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  {t("onboarding.back")}
                </Button>
                <Button onClick={handleComplete} className="h-12 rounded-xl flex-[2] font-medium shadow-glow">
                  {t("onboarding.finish")} <Check className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: COMPLETION */}
          {currentStep === Step.COMPLETION && (
            <motion.div
              key="completion"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center space-y-6 relative z-10 bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8"
            >
              <motion.div className="w-1 h-32 bg-gradient-to-b from-transparent via-primary to-transparent mx-auto relative overflow-hidden rounded-full mb-8">
                <motion.div initial={{ y: -100 }} animate={{ y: 200 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-white/50 blur-[2px]" />
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-4xl md:text-5xl font-heading font-bold text-foreground drop-shadow-lg tracking-tight">
                {t("onboarding.completionTitle")}
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-xl text-primary font-medium">
                {t("onboarding.completionDesc")}
              </motion.p>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="pt-8">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Custom Scroll Wheel Item component
function ScrollColumn({ items, selected, onChange, valueDisplay, displayMapper, label }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  let scrollTimeout: any = null;

  const selectedValue = typeof valueDisplay !== "undefined" ? valueDisplay : selected;
  const selectedIndex = items.findIndex((i: any) => i === selectedValue);

  useEffect(() => {
    // Scroll to the selected item initially
    if (containerRef.current) {
      if (selectedIndex >= 0) {
        containerRef.current.scrollTop = selectedIndex * 48; // 48px height per item
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isAnimating = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating) return;

      const direction = Math.sign(e.deltaY);
      if (direction === 0) return;

      const targetIndex = selectedIndex + direction;

      if (targetIndex >= 0 && targetIndex < items.length) {
        isAnimating = true;
        onChange(items[targetIndex]);
        container.scrollTo({
          top: targetIndex * 48,
          behavior: "smooth",
        });

        setTimeout(() => {
          isAnimating = false;
        }, 200);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [selectedIndex, items, onChange]);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      setIsScrolling(false);
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / 48);
      if (items[index]) {
        onChange(items[index]);
        // snap to exact position
        containerRef.current.scrollTo({ top: index * 48, behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <div className="flex-1 flex flex-col items-center h-full relative">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground absolute -top-1 z-30 bg-input/80 px-2 rounded-full">{label}</span>
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar pt-[84px] pb-[84px]"
      >
        {items.map((item: any, idx: number) => {
          const isSelected = (typeof valueDisplay !== "undefined" ? valueDisplay : selected) === item;
          const displayVal = displayMapper ? displayMapper(item) : item;
          return (
            <div 
              key={idx} 
              className={`h-[48px] snap-center flex items-center justify-center transition-all duration-200 cursor-pointer ${isSelected && !isScrolling ? 'text-primary font-bold text-2xl scale-110 drop-shadow-md' : 'text-muted-foreground text-lg opacity-40 hover:opacity-100 hover:text-foreground'}`}
              onClick={() => {
                onChange(item);
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: idx * 48, behavior: 'smooth' });
                }
              }}
            >
              {displayVal}
            </div>
          )
        })}
      </div>
    </div>
  );
}
