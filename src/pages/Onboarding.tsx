"use client";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Sparkles, Check, ChevronRight, User, 
  Calendar, Lock, Globe, Users, Loader2, Image as ImageIcon,
  Dna
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea"; // Assuming we have this, or I'll use a normal textarea

// Fun Bio Prompts
const BIO_PROMPTS = [
  "Building something my future self will thank me for.",
  "Still figuring things out — and that's okay.",
  "Documenting life, one moment at a time.",
  "Leaving breadcrumbs for my future self.",
  "An archivist of my own experiences."
];

// Step Enums
enum Step {
  IDENTITY = 0,
  DOB = 1,
  AVATAR = 2,
  PRIVACY = 3,
  COMPLETION = 4
}

const STEP_LABELS = [
  { id: Step.IDENTITY, label: "Identity", icon: User },
  { id: Step.DOB, label: "Origin", icon: Calendar },
  { id: Step.AVATAR, label: "Visage", icon: ImageIcon },
  { id: Step.PRIVACY, label: "Control", icon: Lock },
  { id: Step.COMPLETION, label: "Future", icon: Sparkles }
];

export default function Onboarding() {
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
          // if data.onboardingCompleted is already true, maybe redirect to dashboard
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
    
    try {
      if (!auth.currentUser) throw new Error("No user logged in");
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);

      // Format DOB
      const dobStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatarUrl || auth.currentUser.photoURL
      });

      await setDoc(userRef, {
        uid,
        email: auth.currentUser.email || "",
        name,
        username: username || name.split(' ')[0].toLowerCase(),
        bio,
        dateOfBirth: dobStr,
        photoURL: avatarUrl || "",
        privacyLevel: privacy,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Wait a moment so they can see the completion screen
      setTimeout(() => {
        navigate("/dashboard");
      }, 3500);

    } catch (error) {
      console.error("Error saving onboarding data:", error);
      setIsSubmitting(false);
      // fallback
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
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    })
  };

  const direction = 1; // Always moving forward for this flow

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
                  {playfulMode ? "What should time remember you as?" : "Complete Your Profile"}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? "Set up your identity across time." : "Please enter your details."}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Full Name</label>
                  <Input 
                    placeholder="Your actual name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="bg-input/50 border-border h-12 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground ml-1">Username</label>
                  <p className="text-xs text-muted-foreground ml-1 mb-2">
                    {playfulMode ? "Pick your signal in the future 👀" : "Choose a unique username."}
                  </p>
                  <Input 
                    placeholder="@username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    className={`bg-input/50 border-border h-12 rounded-xl focus-visible:ring-primary ${usernameAvailable === false ? 'border-destructive focus-visible:ring-destructive' : usernameAvailable === true ? 'border-success focus-visible:ring-success' : ''}`}
                  />
                  {username.length > 2 && usernameAvailable === true && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1"><Check className="w-3 h-3"/> {playfulMode ? "This identity is yours." : "Available"}</p>
                  )}
                  {username.length > 2 && usernameAvailable === false && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">Someone from another timeline took this.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground ml-1">Bio</label>
                    <button 
                      onClick={() => setBio(BIO_PROMPTS[Math.floor(Math.random() * BIO_PROMPTS.length)])}
                      className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> Help me write
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground ml-1 mb-2">
                    {playfulMode ? "Leave a note about who you are right now." : "Write a short bio."}
                  </p>
                  <textarea 
                    placeholder="Documenting life, one moment at a time..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-input/50 border border-border text-foreground rounded-xl p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground text-sm"
                  />
                  {bio.length === 0 && playfulMode && (
                    <p className="text-xs text-muted-foreground italic text-center mt-2">Say something… your future self is listening.</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleNext} 
                disabled={!name || !username || usernameAvailable === false}
                className="w-full h-12 rounded-xl text-md font-medium shadow-glow"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
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
                  {playfulMode ? "When did your story begin?" : "Date of Birth"}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? "We'll remember this. So will your future." : "Please provide your birthday."}
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
                    label="Day"
                  />
                  <ScrollColumn 
                    items={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']} 
                    selected={month} 
                    onChange={(val) => setMonth(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(val as string) + 1)} 
                    valueDisplay={month}
                    label="Month"
                  />
                  <ScrollColumn 
                    items={Array.from({length: 100}, (_, i) => new Date().getFullYear() - i)} 
                    selected={year} 
                    onChange={setYear} 
                    label="Year"
                  />
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.IDENTITY)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  Back
                </Button>
                <Button onClick={handleNext} className="h-12 rounded-xl flex-[2] font-medium shadow-glow">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
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
                  {playfulMode ? "Show your face..." : "Profile Picture"}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? "...or stay a mystery." : "Upload an avatar."}
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
                      className="absolute -bottom-2 -right-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-full shadow-md rotate-12"
                    >
                      Mystery!
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 mt-10">
                  <Button variant="outline" className="h-12 rounded-xl border-border hover:bg-elevated justify-start px-6" onClick={() => {/* Handle Upload */}}>
                    <Upload className="w-4 h-4 mr-3 text-primary" /> Upload Image
                  </Button>
                  <Button variant="outline" className="h-12 rounded-xl border-border hover:bg-elevated justify-start px-6" onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/notionists/svg?seed=${username || 'fora'}`)}>
                    <Dna className="w-4 h-4 mr-3 text-secondary" /> Auto-Generate Abstract
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.DOB)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  Back
                </Button>
                <Button onClick={handleNext} className="h-12 rounded-xl flex-[2] font-medium shadow-glow">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
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
              className="bg-surface/60 backdrop-blur-xl border border-border shadow-card rounded-3xl p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-heading font-bold">
                  {playfulMode ? "Who gets access to your timeline?" : "Privacy Settings"}
                </h2>
                <p className="text-muted-foreground">
                  {playfulMode ? "You decide who hears your voice." : "Choose your profile visibility."}
                </p>
              </div>

              <div className="space-y-4 py-4">
                {[
                  { id: "private", title: "Only me", desc: "Your capsules and profile remain a secret vault.", icon: Lock },
                  { id: "connections", title: "People I choose", desc: "Friends and connections can view your timeline.", icon: Users },
                  { id: "public", title: "Public presence", desc: "Your story is open to the entire Forá community.", icon: Globe }
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = privacy === option.id;
                  return (
                    <div 
                      key={option.id}
                      onClick={() => setPrivacy(option.id as any)}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-input/30 hover:border-border/80'}`}
                    >
                      {isSelected && (
                        <motion.div layoutId="privacy-glow" className="absolute inset-0 bg-primary/5 shadow-[inset_0_0_20px_rgba(251,99,118,0.1)]" />
                      )}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-full ${isSelected ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-surface text-muted-foreground'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{option.title}</h4>
                          <p className="text-sm text-muted-foreground">{option.desc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-4 w-full">
                <Button variant="outline" onClick={() => setCurrentStep(Step.AVATAR)} className="h-12 rounded-xl flex-1 border-border text-foreground hover:bg-elevated">
                  Back
                </Button>
                <Button onClick={handleComplete} className="h-12 rounded-xl flex-[2] font-medium bg-gradient-primary text-white shadow-glow">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Journey"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: COMPLETION */}
          {currentStep === Step.COMPLETION && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center space-y-6 relative z-10"
            >
              {/* Glowing Line Animation */}
              <motion.div 
                className="w-1 h-32 bg-gradient-to-b from-transparent via-primary to-transparent mx-auto relative overflow-hidden rounded-full mb-8"
              >
                <motion.div 
                  initial={{ y: -100 }}
                  animate={{ y: 200 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-white/50 blur-[2px]"
                />
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl md:text-5xl font-heading font-bold text-foreground drop-shadow-lg tracking-tight"
              >
                Your timeline is now alive.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xl text-primary font-medium"
              >
                Everything you write from here... will meet you again.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="pt-8"
              >
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
function ScrollColumn({ items, selected, onChange, valueDisplay, label }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  let scrollTimeout: any = null;

  useEffect(() => {
    // Scroll to the selected item initially
    if (containerRef.current) {
      const selectedIndex = items.findIndex((i: any) => i === selected || i === valueDisplay);
      if (selectedIndex >= 0) {
        containerRef.current.scrollTop = selectedIndex * 48; // 48px height per item
      }
    }
  }, []);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      setIsScrolling(false);
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / 48);
      if (items[index]) {
        if (typeof valueDisplay !== "undefined") {
          onChange(items[index]);
        } else {
          onChange(items[index]);
        }
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
              {item}
            </div>
          )
        })}
      </div>
    </div>
  );
}
