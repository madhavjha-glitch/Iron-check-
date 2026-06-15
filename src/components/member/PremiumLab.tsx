import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Dumbbell, Utensils, Video, Radio, UserCheck, 
  Users, Award, Eye, Heart, Check, Plus, AlertCircle, 
  Send, ExternalLink, RefreshCw, Volume2, StepForward,
  Flame, Droplet, Clock, Zap, MessageSquare, HeartHandshake,
  Upload, Sparkle, Camera
} from "lucide-react";
import { MemberProfile } from "../../types";

interface PremiumLabProps {
  userProfile: MemberProfile;
  attendanceLogsCount: number;
  onBackToDashboard: () => void;
}

export default function PremiumLab({ userProfile, attendanceLogsCount, onBackToDashboard }: PremiumLabProps) {
  const [activeSub, setActiveSub] = useState<string>("home");

  // Premium Features general list
  const premiumApps = [
    { id: "workout-ai", title: "AI Workout Architect", desc: "Custom splits based on physical parameters", icon: Dumbbell, badge: "AI Powered", color: "from-indigo-600 to-blue-500" },
    { id: "nutrition-ai", title: "AI Sports Kitchen", desc: "Automated custom calorie & macros diet layouts", icon: Utensils, badge: "Nutrition AI", color: "from-orange-500 to-amber-500" },
    { id: "video-library", title: "Video Form Studio", desc: "Instructional library of compound movements", icon: Video, badge: "Videos", color: "from-rose-500 to-pink-500" },
    { id: "live-stream", title: "Live Streaming Arena", desc: "Interactive virtual gym classes with live chat", icon: Radio, badge: "LIVE NOW", color: "from-red-600 to-orange-500" },
    { id: "trainer", title: "Trainer Matching Desk", desc: "Bind dedicated coaches & private counselors", icon: UserCheck, badge: "VIP Coaching", color: "from-purple-600 to-indigo-500" },
    { id: "social", title: "Iron Social Feed", desc: "Follow gym peers & trade FitClap cheers", icon: Users, badge: "Social Hub", color: "from-emerald-500 to-teal-500" },
    { id: "badges", title: "Achievements Wall", desc: "Unlock certified milestones & merit badges", icon: Award, badge: "Rewards", color: "from-amber-500 to-yellow-400" },
    { id: "vision-counter", title: "AI Vision Port", desc: "Camera rep tracker for push-ups & squats", icon: Eye, badge: "Vision AI", color: "from-cyan-500 to-blue-600" },
    { id: "wearable", title: "Wearable Sync Lab", desc: "Sync workouts from Apple Health & Google Fit", icon: Heart, badge: "Active Sync", color: "from-fuchsia-500 to-purple-600" }
  ];

  /* -------------------------------------------------------------
     1. AI Workout Recommendations State
  ------------------------------------------------------------- */
  const [goal, setGoal] = useState<string>("Hypertrophy & Muscle Synthesis");
  const [experience, setExperience] = useState<string>("Intermediate (1-3 Years)");
  const [weightInput, setWeightInput] = useState<string>("179");
  const [constraints, setConstraints] = useState<string>("Slight left knee strain");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [workoutAiFeedback, setWorkoutAiFeedback] = useState<string>("");
  const [generatingWorkout, setGeneratingWorkout] = useState<boolean>(false);

  // Trigger Workout generation endpoint
  const handleGenerateWorkout = async () => {
    setGeneratingWorkout(true);
    setWorkoutAiFeedback("");
    try {
      const res = await fetch("/api/gemini/workout-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          experience,
          weight: weightInput,
          constraints,
          daysPerWeek
        })
      });
      if (!res.ok) throw new Error("Server coach taking a breather");
      const data = await res.json();
      setWorkoutAiFeedback(data.recommendation);
      
      // Track stats
      localStorage.setItem("premium_badge_workout_ai", "true");
    } catch (e: any) {
      setWorkoutAiFeedback(`❌ Live Workout Architect: offline fallback workout compiled.
      
## Coach Fallback Hypertrophy Plan (3 Days/Week)
- **Day 1**: Push focus (Dumbbell Bench Press, Incline DB Press, Overhead Press, Cable Triceps Extension)
- **Day 2**: Pull focus (Lat pulldowns, Bent-over DB row, Dumbbell Hammer curls, Face pulls)
- **Day 3**: Leg rehab (Leg press with knee caution, Goblet squat light, Standing Calf raise)

*AI connection failed (${e.message}), showing pre-compiled fallback.*`);
    } finally {
      setGeneratingWorkout(false);
    }
  };

  /* -------------------------------------------------------------
     2. Nutrition AI State
  ------------------------------------------------------------- */
  const [calories, setCalories] = useState<number>(2400);
  const [dietType, setDietType] = useState<string>("Sustained High Protein (Muscle Build)");
  const [nutritionGoal, setNutritionGoal] = useState<string>("Increase lean skeletal mass & drop body fat");
  const [nutritionAiFeedback, setNutritionAiFeedback] = useState<string>("");
  const [generatingNutrition, setGeneratingNutrition] = useState<boolean>(false);

  // Trigger Nutrition AI endpoint
  const handleGenerateNutrition = async () => {
    setGeneratingNutrition(true);
    setNutritionAiFeedback("");
    try {
      const res = await fetch("/api/gemini/nutrition-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories,
          dietType,
          goal: nutritionGoal
        })
      });
      if (!res.ok) throw new Error("Chef is taking back of house rest");
      const data = await res.json();
      setNutritionAiFeedback(data.meals);
      
      // Track stats
      localStorage.setItem("premium_badge_nutrition_ai", "true");
    } catch (e: any) {
      setNutritionAiFeedback(`❌ Nutrition Expert: offline fallback meal plan synchronized.
      
- **Breakfast**: 4 Egg whites scrambled, 2 slices whole-wheat toast, 1 tablespoon peanut butter. (450 calories, 35g protein)
- **Lunch**: 180g Grilled breast fillet, 150g brown rice, roasted broccoli bouquet. (650 calories, 50g protein)
- **Dinner**: 200g Baked Cod steak, grilled sweet potato spears, green bean medley. (550 calories, 42g protein)
- **Post-session Snack**: Whey whey scoop, skim milk, banana slice. (350 calories, 30g protein)

*Chef server offline (${e.message}), offline emergency layout generated.*`);
    } finally {
      setGeneratingNutrition(false);
    }
  };

  /* -------------------------------------------------------------
     3. Video exercise library
  ------------------------------------------------------------- */
  const videoGuides = [
    { id: "squat", title: "Squat form masterclass", duration: "2:45", coach: "Coach Iron", desc: "Perfect hip crease depth & hamstring-quad engagement protocols.", source: "Core-Barbell Training" },
    { id: "bench", title: "Bench press bar trajectory", duration: "1:55", coach: "Coach Marcus", desc: "Elbow path alignment parameters to bypass shoulder strain.", source: "Chest Biomechanics" },
    { id: "deadlift", title: "Deadlift lumbar guard", duration: "3:10", coach: "Coach Iron", desc: "Proper pelvic wedge positioning & lats tension principles.", source: "Posterior Chain Day" }
  ];
  const [activeVideo, setActiveVideo] = useState(videoGuides[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isVideoPlaying && videoProgress < 100) {
      timer = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            localStorage.setItem("premium_badge_video", "true");
            return 100;
          }
          return prev + 5;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isVideoPlaying, videoProgress]);

  /* -------------------------------------------------------------
     4. Live Class Arena
  ------------------------------------------------------------- */
  const liveClasses = [
    { id: "flow", title: "Sunrise Power Yoga Flow", coach: "Selene", joined: false },
    { id: "shred", title: "HIIT Tabata Cardio Burnout", coach: "Marcus", joined: false },
    { id: "muscle", title: "Bodybuilding Lats Masterclass", coach: "Coach Iron", joined: false }
  ];
  const [activeClass, setActiveClass] = useState<any>(liveClasses[1]);
  const [joinedStream, setJoinedStream] = useState<boolean>(false);
  const [liveChatMessages, setLiveChatMessages] = useState<Array<{ sender: string, text: string }>>([
    { sender: "Jessica Miller", text: "Warmup was wild! My calves are fully locked!" },
    { sender: "Rohan Kumar", text: "The audio sync is crystal clear, let's crush!" },
    { sender: "Arjun Sharma", text: "Greeting from Delhi grid center!" }
  ]);
  const [chatInputMessage, setChatInputMessage] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat and mock incoming messages
  useEffect(() => {
    if (joinedStream) {
      localStorage.setItem("premium_badge_stream", "true");
      
      const mockSenders = ["Sarah Bennett", "Coach Marcus", "Devon L", "Tyson Fletcher", "Mia Campbell"];
      const mockQuotes = [
        "Let's speed up the tempo!",
        "Active posture looks incredible!",
        "Already sweat dripping!",
        "Are we lifting after this?",
        "Consistent rep cadence is perfect!!",
        "Absolutely burning those morning carbs!"
      ];

      const msgTimer = setInterval(() => {
        const randSender = mockSenders[Math.floor(Math.random() * mockSenders.length)];
        const randQuote = mockQuotes[Math.floor(Math.random() * mockQuotes.length)];
        setLiveChatMessages(prev => [...prev, { sender: randSender, text: randQuote }]);
      }, 4000);

      return () => clearInterval(msgTimer);
    }
  }, [joinedStream]);

  // Keep chat scrolled
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [liveChatMessages]);

  const handleSendLiveMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputMessage.trim()) return;
    setLiveChatMessages(prev => [...prev, { sender: "You", text: chatInputMessage }]);
    setChatInputMessage("");
  };

  /* -------------------------------------------------------------
     5. Trainer Matchmaker State
  ------------------------------------------------------------- */
  const trainerProfileList = [
    { id: "iron", name: "Coach Iron", specialty: "Heavy Powerlifting & Strongman", bio: "Former national bench record holder. Believable compound strength, nononsense biomechanics setups.", rating: "5.0 ★" },
    { id: "selene", name: "Coach Selene", specialty: "Vinyasa Flow, Flexibility Rehabilitation", bio: "Rehab therapist certified. Focuses on muscular length, hip/hip-crease alignment, pain-free posture restoration.", rating: "4.9 ★" },
    { id: "sarah", name: "Coach Sarah", specialty: "Contour Sculpting, High-Yield Fat Burn", bio: "Specialized in metabolic conditioning and targeted contest prep nutrition blueprints.", rating: "4.8 ★" }
  ];
  const [matchedTrainer, setMatchedTrainer] = useState<string>("");
  const [trainerChatLogs, setTrainerChatLogs] = useState<Array<{ sender: string, text: string }>>([]);
  const [trainerInputMsg, setTrainerInputMsg] = useState("");

  useEffect(() => {
    const savedCoach = localStorage.getItem("premium_coach_assigned");
    if (savedCoach) {
      setMatchedTrainer(savedCoach);
    }
  }, []);

  const handleSelectCoach = (coachId: string) => {
    setMatchedTrainer(coachId);
    localStorage.setItem("premium_coach_assigned", coachId);
    
    // Initial greeting from coach
    const coachName = trainerProfileList.find(c => c.id === coachId)?.name || "Trainer";
    setTrainerChatLogs([
      { sender: coachName, text: `Hello athlete! I am officially synced to your biometric locker statistics. Ready to map out your Compound physical lifts and dietary thresholds. Drop a message with your core question!` }
    ]);
  };

  const handleSendTrainerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerInputMsg.trim()) return;
    const userMsgText = trainerInputMsg;
    setTrainerChatLogs(prev => [...prev, { sender: "You", text: userMsgText }]);
    setTrainerInputMsg("");

    // Simulate replies from coach
    setTimeout(() => {
      const coachName = trainerProfileList.find(c => c.id === matchedTrainer)?.name || "Trainer";
      const typicalReplies = [
        "That is an outstanding biomechanics question. I recommend focusing on a slow eccentric control (3 seconds down) on your compound sets.",
        "Ensure your protein ceiling hits at least 1.6g per kilogram of target body weight. Keep hydrating!",
        "Rest and active recovery are vital! Take a hot bath tonight and ensure 7.5 hours of solid sleep.",
        "Your attendance logs are checking out nicely. Let's step up the heavy press volume in our next session!"
      ];
      const coachReply = typicalReplies[Math.floor(Math.random() * typicalReplies.length)];
      setTrainerChatLogs(prev => [...prev, { sender: coachName, text: coachReply }]);
    }, 1500);
  };

  /* -------------------------------------------------------------
     6. Social Features State (Cheer & Gym Public Feed)
  ------------------------------------------------------------- */
  interface GymSocialPost {
    id: number;
    user: string;
    action: string;
    claps: number;
    cheered: boolean;
  }

  const [socialFeed, setSocialFeed] = useState<GymSocialPost[]>([
    { id: 1, user: "Rohan Kumar", action: "Just conquered a heavy deadlift set (365 lbs x 3 reps) on physical logs!", claps: 12, cheered: false },
    { id: 2, user: "Jessica Miller", action: "Completed an immersive 45-minute Yoga sunrise tutorial with Coach Selene!", claps: 8, cheered: false },
    { id: 3, user: "Arjun Bennett", action: "Scanned the gym entrance gate! Checking in for raw hypertrophy legs week.", claps: 4, cheered: false }
  ]);

  const [followedUsers, setFollowedUsers] = useState<string[]>(["Rohan Kumar"]);
  const [ownSocialPostText, setOwnSocialPostText] = useState("");

  const handleToggleFollow = (user: string) => {
    let updated;
    if (followedUsers.includes(user)) {
      updated = followedUsers.filter(u => u !== user);
    } else {
      updated = [...followedUsers, user];
      localStorage.setItem("premium_badge_social", "true");
    }
    setFollowedUsers(updated);
  };

  const handleCheerClap = (id: number) => {
    const updated = socialFeed.map(post => {
      if (post.id === id) {
        return {
          ...post,
          claps: post.cheered ? post.claps - 1 : post.claps + 1,
          cheered: !post.cheered
        };
      }
      return post;
    });
    setSocialFeed(updated);
    localStorage.setItem("premium_badge_social", "true");
  };

  const handlePublishFeedPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownSocialPostText.trim()) return;

    const newPost: GymSocialPost = {
      id: Date.now(),
      user: userProfile.name,
      action: ownSocialPostText,
      claps: 0,
      cheered: false
    };

    setSocialFeed([newPost, ...socialFeed]);
    setOwnSocialPostText("");
  };

  /* -------------------------------------------------------------
     7. Achievements & Badges Wall
  ------------------------------------------------------------- */
  const achievementBadgesList = [
    { id: "gym_scan", name: "Iron Pioneer", desc: "Scan first gym QR at biometric gate", keyStat: attendanceLogsCount > 0 },
    { id: "workout_ai", name: "Aero-Gym Architect", desc: "Build an AI physical workout liftsplit", keyStat: localStorage.getItem("premium_badge_workout_ai") === "true" },
    { id: "nutrition_ai", name: "Scientific Kitchen", desc: "Design meal layouts using Nutrition AI", keyStat: localStorage.getItem("premium_badge_nutrition_ai") === "true" },
    { id: "video", name: "Form Scholar", desc: "Complete 1 compound video instruction tape", keyStat: localStorage.getItem("premium_badge_video") === "true" },
    { id: "stream", name: "Live Gladiator", desc: "Join an active live virtual gym class", keyStat: localStorage.getItem("premium_badge_stream") === "true" },
    { id: "social", name: "Clap cheerleader", desc: "Follow an athlete or clap fitcheers on feed", keyStat: localStorage.getItem("premium_badge_social") === "true" },
    { id: "wearable", name: "Biometric Swimmer", desc: "Sync Step metrics from Apple Health / Google Fit", keyStat: localStorage.getItem("premium_badge_wearer") === "true" },
    { id: "vision", name: "Optic Rep Prodigy", desc: "Complete a camera push-up or squat rep check-off", keyStat: localStorage.getItem("premium_badge_vision_rep") === "true" }
  ];

  /* -------------------------------------------------------------
     8. AI Rep Tracker (Vision Simulation with Camera option)
  ------------------------------------------------------------- */
  const [useCameraStream, setUseCameraStream] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [repChoice, setRepChoice] = useState("Pushups");
  const [visionDetectStatus, setVisionDetectStatus] = useState("Awaiting posture calibration");
  const [soundFeedback, setSoundFeedback] = useState(true);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);

  // Audio Rep generator
  const triggerAudioBeep = () => {
    if (!soundFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 650; // sharp high beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  // Setup actual webcamera if toggled
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (useCameraStream) {
      setVisionDetectStatus("Configuring device lens...");
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => {
          localStream = stream;
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = stream;
          }
          setVisionDetectStatus("LOCK ACQUIRED • Tracking hip & knee vectors");
        })
        .catch(err => {
          console.error(err);
          setVisionDetectStatus("Default camera block. Simulating trackers.");
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useCameraStream]);

  // Mock particle canvas vector drawing on camera frame
  useEffect(() => {
    let animId: any;
    const canvas = canvasElementRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        let frameCount = 0;
        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          frameCount++;

          // Draw grid and crosshairs
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.lineWidth = 1;

          // Scanning laser line
          const laserY = Math.sin(frameCount * 0.05) * (canvas.height / 2) + (canvas.height / 2);
          ctx.beginPath();
          ctx.moveTo(0, laserY);
          ctx.lineTo(canvas.width, laserY);
          ctx.stroke();

          // Simulating joints points in color neon tracking
          const points = [
            { id: "Shoulder", x: 60 + Math.sin(frameCount * 0.1) * 2, y: 40 },
            { id: "Hip", x: 70 + Math.sin(frameCount * 0.1) * 3, y: 110 },
            { id: "Knee", x: 90 + Math.sin(frameCount * 0.08) * 8, y: 150 },
            { id: "Ankle", x: 100, y: 190 }
          ];

          // Draw skeleton bones lines
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();

          // Draw joint nodes
          points.forEach(p => {
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = "7.5px monospace";
            ctx.fillText(p.id, p.x + 8, p.y + 2);
          });

          // Calibration text status indicator
          ctx.fillStyle = "#06b6d4";
          ctx.font = "8px monospace";
          ctx.fillText(`VECTOR ANGLE: ${(85 + Math.sin(frameCount * 0.08) * 45).toFixed(1)}°`, 10, 20);

          animId = requestAnimationFrame(render);
        };
        render();
      }
    }
    return () => cancelAnimationFrame(animId);
  }, [useCameraStream, repChoice]);

  const handleSimulateRepTick = () => {
    setRepCount(prev => {
      const incremented = prev + 1;
      triggerAudioBeep();
      localStorage.setItem("premium_badge_vision_rep", "true");
      return incremented;
    });
    setVisionDetectStatus(`SQUAT DEPTH CLEAR • Rep logged successfully!`);
  };

  /* -------------------------------------------------------------
     9. Wearable Health Integration State
  ------------------------------------------------------------- */
  const [wearableSynced, setWearableSynced] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"apple" | "google" | "">("");
  const [healthData, setHealthData] = useState({
    steps: 8421,
    calories: 450,
    activeMinutes: 45,
    sleep: "7h 12m"
  });

  const handleToggleSyncWearable = (provider: "apple" | "google") => {
    if (wearableSynced && selectedProvider === provider) {
      setWearableSynced(false);
      setSelectedProvider("");
    } else {
      setWearableSynced(true);
      setSelectedProvider(provider);
      localStorage.setItem("premium_badge_wearer", "true");
      // Add a slight randomization to steps
      setHealthData({
        steps: Math.floor(Math.random() * 4000) + 7500,
        calories: Math.floor(Math.random() * 200) + 380,
        activeMinutes: Math.floor(Math.random() * 25) + 35,
        sleep: `${Math.floor(Math.random() * 2) + 6}h ${Math.floor(Math.random() * 59)}m`
      });
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100" id="premium-lab-panel">
      
      {/* Premium Hub Header Navigation */}
      <div className="border-b border-white/5 bg-slate-900/60 p-4 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <button 
          onClick={activeSub === "home" ? onBackToDashboard : () => setActiveSub("home")}
          className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          &larr; {activeSub === "home" ? "Back to Dashboard" : "Main Hub"}
        </button>

        <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 py-1 px-3 rounded-xl border border-white/10 shadow">
          <Zap className="h-3.5 w-3.5 text-amber-300 animate-bounce fill-amber-300" />
          <span className="text-[10px] font-black tracking-widest text-white uppercase">PREMIUM VIP LAB</span>
        </div>
      </div>

      {/* Main Core Body Area */}
      <div className="flex-1 overflow-y-auto pb-8">
        
        {/* ==========================================
            HOME SUB-INDEX BENTO LIST VIEW
            ========================================== */}
        {activeSub === "home" && (
          <div className="p-5 space-y-6">
            
            {/* Elegant Hero Banner */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-5 border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute right-0 top-0 opacity-15 text-indigo-300 pointer-events-none transform translate-y-2 translate-x-4">
                <Sparkle className="h-44 w-44" />
              </div>
              <div className="relative space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 py-1 px-2.5 rounded-full border border-indigo-500/20">
                  Secure Cloud-Run Lab
                </span>
                <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight uppercase">VIP AI Biometrics Suite</h3>
                <p className="text-xs text-slate-300 leading-normal max-w-sm">
                  Welcome to your highly integrated athletic sandbox. Unlock personalized coaching intelligence, health integrations, and automated form analysis tracking.
                </p>
              </div>
            </div>

            {/* Premium App Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Applications ({premiumApps.length})</span>
              
              <div className="grid grid-cols-1 gap-3">
                {premiumApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => setActiveSub(app.id)}
                    className="w-full text-left bg-slate-905 border border-white/5 hover:border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 select-none hover:bg-slate-900 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${app.color} text-white shadow-md`}>
                        <app.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">{app.title}</h4>
                          <span className="text-[8px] font-extrabold uppercase bg-indigo-950 text-indigo-300 border border-indigo-500/10 py-0.5 px-2 rounded-full">
                            {app.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{app.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-extrabold shrink-0 hover:translate-x-1 transition-transform">
                      Open &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            1. AI WORKOUT RECOMMENDATION SYSTEM
            ========================================== */}
        {activeSub === "workout-ai" && (
          <div className="p-5 space-y-5">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow space-y-4">
              <div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">Machine Learning Liftsplit</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">AI Workout Architect</h3>
              </div>

              <div className="text-xs space-y-3.5">
                
                {/* Physical goal input selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Liftsplit Target Focus</label>
                  <select 
                    value={goal} 
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-indigo-505"
                  >
                    <option>Hypertrophy & Muscle Synthesis</option>
                    <option>Maximal Raw strength & Powerlifting</option>
                    <option>Cut Fat & Sculpt Lean Definition</option>
                    <option>Cardio Stamina & Conditioning</option>
                  </select>
                </div>

                {/* Experience level custom picker */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Experience Classification</label>
                  <select 
                    value={experience} 
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-indigo-505"
                  >
                    <option>Beginner (Familiarizing with Lifts)</option>
                    <option>Intermediate (1-3 years of logging)</option>
                    <option>Advanced Athlete (Competitive focus)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Weight log metric */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Current Weight (lbs)</label>
                    <input 
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-indigo-505 font-mono"
                    />
                  </div>
                  {/* Days per week index */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Weekly frequency</label>
                    <select 
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-indigo-505"
                    >
                      <option value={2}>2 Days</option>
                      <option value={3}>3 Days</option>
                      <option value={4}>4 Days</option>
                      <option value={5}>5 Days</option>
                    </select>
                  </div>
                </div>

                {/* Injuries restriction list */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Physical Restraints / Injury Concerns</label>
                  <input 
                    type="text"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="E.g., Left shoulder impingement"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-indigo-505"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateWorkout}
                  disabled={generatingWorkout}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow"
                >
                  {generatingWorkout ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      COMPILING STRENGTH PLAN...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      BUILD SYSTEM WORKOUT PLAN
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* AI Response Display Box */}
            {workoutAiFeedback && (
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[8.5px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 inline-block font-mono">
                  Gym AI Core Output
                </span>
                
                {/* Styled text parser */}
                <div className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words prose select-text overflow-x-auto max-h-[400px] border border-white/5 bg-slate-955 p-3 rounded-2xl">
                  {workoutAiFeedback}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================
            2. NUTRITION AI DIET BLUEPRINT
            ========================================== */}
        {activeSub === "nutrition-ai" && (
          <div className="p-5 space-y-5">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow space-y-4">
              <div>
                <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest block">Thermodynamic Sports Diet</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">AI Diet Kitchen</h3>
              </div>

              <div className="text-xs space-y-4">
                
                {/* Calories Slider bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="uppercase">Daily Calorie Target</span>
                    <span className="font-mono text-orange-400 text-xs">{calories} kcal</span>
                  </div>
                  <input 
                    type="range"
                    min="1400"
                    max="4500"
                    step="100"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full accent-orange-500 outline-none h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Diet choice dropdown layout */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Dietary Blueprint Type</label>
                  <select 
                    value={dietType} 
                    onChange={(e) => setDietType(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-orange-505"
                  >
                    <option>Sustained High Protein (Muscle Build)</option>
                    <option>Strict Plant-Based Vegan Athlete</option>
                    <option>Keto Low-Carb High-Fat Model</option>
                    <option>Standard Balanced Mediterranean Diet</option>
                    <option>Lactose-Free & Gluten-Free Lean Bulk</option>
                  </select>
                </div>

                {/* Goal trajectory input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Athletic Health Goal</label>
                  <input 
                    type="text"
                    value={nutritionGoal}
                    onChange={(e) => setNutritionGoal(e.target.value)}
                    placeholder="E.g., Drop 2% body fat, sustain lean muscle"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-orange-505"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateNutrition}
                  disabled={generatingNutrition}
                  className="w-full bg-orange-600 hover:bg-orange-550 disabled:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow"
                >
                  {generatingNutrition ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      SIMULATING CALORIC MACROS...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      GENERATE MEAL SELECTIONS
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* AI Nutrition outcome layout */}
            {nutritionAiFeedback && (
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                <span className="text-[8.5px] font-black uppercase tracking-wider bg-orange-955 text-orange-300 px-2 py-0.5 rounded border border-orange-550 inline-block font-mono">
                  Nutrition Diet Output
                </span>
                
                <div className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words prose select-text overflow-x-auto max-h-[400px] border border-white/5 bg-slate-955 p-3 rounded-2xl">
                  {nutritionAiFeedback}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================
            3. VIDEO EXERCISE COMPONENT MODULE
            ========================================== */}
        {activeSub === "video-library" && (
          <div className="p-5 space-y-4">
            
            {/* Visual Studio TV frame layout */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              
              {/* Premium Simulated Video Player */}
              <div className="aspect-video bg-black relative flex flex-col items-center justify-center overflow-hidden border-b border-white/5 group">
                
                {/* Simulated video playback graphics */}
                {isVideoPlaying ? (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-4 font-mono select-none">
                    <div className="flex justify-between text-[9px] text-indigo-400">
                      <span>🎥 STREAM IN PROGRESS</span>
                      <span className="animate-pulse flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> FEED: LIVE HD
                      </span>
                    </div>

                    {/* Highly interactive visual: animated barbell squat or chest-press diagram */}
                    <div className="flex-1 flex flex-col items-center justify-center space-y-2">
                      <div className="relative">
                        <Dumbbell className="h-12 w-12 text-indigo-500 animate-bounce" />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full" />
                      </div>
                      <span className="text-[10px] text-white font-extrabold text-center uppercase tracking-wider">
                        {activeVideo.title} • {videoProgress}% Done
                      </span>
                    </div>

                    {/* Active timeline progress bars */}
                    <div className="space-y-1">
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${videoProgress}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-slate-500">
                        <span>0:00</span>
                        <span>{activeVideo.duration}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 cursor-pointer"
                       onClick={() => { setIsVideoPlaying(true); if (videoProgress >= 100) setVideoProgress(0); }}>
                    <div className="h-14 w-14 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-white px-4 leading-normal">{activeVideo.title}</p>
                      <span className="text-[9px] text-indigo-400 font-semibold tracking-wider block mt-1">
                        TAP TO INITIATE TUTORIAL GAUGE • {activeVideo.duration} mins
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Video metrics details */}
              <div className="p-4 space-y-2 font-mono">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="text-indigo-400 font-bold px-2 py-0.5 bg-indigo-950 rounded border border-indigo-500/10">{activeVideo.coach}</span>
                  <span className="text-slate-500 text-[10px]">{activeVideo.source}</span>
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wide mt-1">{activeVideo.title}</h4>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{activeVideo.desc}</p>
              </div>

            </div>

            {/* List selectors of core guides */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Form Library Playlist</span>
              <div className="space-y-2">
                {videoGuides.map(guide => (
                  <button
                    key={guide.id}
                    onClick={() => { setActiveVideo(guide); setIsVideoPlaying(false); setVideoProgress(0); }}
                    className={`w-full text-left p-3 rounded-2xl flex items-center justify-between border select-none cursor-pointer transition-all active:scale-[0.99] ${
                      activeVideo.id === guide.id 
                        ? "bg-slate-900 border-indigo-500/30" 
                        : "bg-slate-905 border-white/5 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-950 text-indigo-400 border border-white/5">
                        <Video className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white tracking-tight leading-none">{guide.title}</h4>
                        <span className="text-[9px] text-slate-500 font-mono mt-1 block">Instructor: {guide.coach}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-indigo-300 bg-indigo-950/40 py-0.5 px-2 rounded-lg border border-indigo-500/10">
                      {guide.duration}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            4. LIVE CLASS STREAMING ARENA
            ========================================== */}
        {activeSub === "live-stream" && (
          <div className="p-5 space-y-4">
            
            {/* Live streaming virtual screen */}
            {joinedStream ? (
              <div className="space-y-4">
                
                {/* Stream Broadcast module */}
                <div className="bg-black border border-white/10 rounded-3xl overflow-hidden aspect-video relative flex flex-col justify-between">
                  <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-black/60 z-10" />
                  
                  {/* Neon active visualizer matrix */}
                  <div className="absolute inset-0 bg-slate-955 flex items-center justify-center font-mono select-none">
                    <div className="text-center space-y-3 p-4">
                      <div className="relative">
                        <Radio className="h-14 w-14 text-rose-500 mx-auto animate-pulse" />
                        <div className="absolute -inset-1 bg-rose-500/20 blur-lg rounded-full animate-ping" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{activeClass.title}</h4>
                        <span className="text-[10px] text-rose-400 font-bold block">In private training session with Coach {activeClass.coach}</span>
                      </div>
                    </div>
                  </div>

                  {/* Header overlays with indicators */}
                  <div className="z-20 p-3 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                    <span className="text-[9px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider tracking-widest animate-pulse flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-ping" /> LIVE VIP STREAM
                    </span>
                    <button 
                      onClick={() => setJoinedStream(false)}
                      className="text-[9px] bg-white/10 hover:bg-white/20 text-white py-1 px-2.5 rounded-lg border border-white/10 active:scale-95 transition-all text-xs cursor-pointer font-bold"
                    >
                      Leave Studio
                    </button>
                  </div>

                  {/* Footer overlays */}
                  <div className="z-20 p-3 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent text-[9.5px]">
                    <span className="text-slate-300 font-mono">Stream Quality: Full HD 1080p</span>
                    <span className="text-emerald-400 font-semibold font-mono animate-pulse">● Connected Securely</span>
                  </div>

                </div>

                {/* Highly interactive Real-time Livechat stream */}
                <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-3.5">
                  <div className="border-b border-white/5 pb-2 flex justify-between items-center shrink-0">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Public Session Chat channel</span>
                    <span className="text-[9px] font-mono text-slate-500">Auto-refreshing live comments</span>
                  </div>

                  {/* Message logs scrolling box */}
                  <div 
                    ref={chatContainerRef}
                    className="max-h-[160px] overflow-y-auto space-y-2.5 pr-1 text-[11px] font-mono select-none"
                  >
                    {liveChatMessages.map((msg, i) => (
                      <div key={i} className="leading-normal break-all">
                        <span className={`font-black uppercase pr-1.5 ${
                          msg.sender === "You" 
                            ? "text-amber-400" 
                            : msg.sender.includes("Coach") 
                              ? "text-rose-400" 
                              : "text-indigo-300"
                        }`}>
                          {msg.sender}:
                        </span>
                        <span className="text-slate-300 font-medium">{msg.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Message sender form */}
                  <form onSubmit={handleSendLiveMessage} className="flex gap-2 text-xs">
                    <input 
                      type="text"
                      value={chatInputMessage}
                      onChange={(e) => setChatInputMessage(e.target.value)}
                      placeholder="Comment something motivationally..."
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-white outline-none focus:border-red-505"
                    />
                    <button 
                      type="submit"
                      className="bg-red-600 hover:bg-red-550 text-white font-extrabold px-3.5 rounded-xl cursor-pointer active:scale-95 transition-transform"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-red-950/40 via-red-950/20 to-slate-955 rounded-3xl border border-red-500/10 space-y-2">
                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest animate-pulse">Schedules Active Daily</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Live Virtual Stream arena</h3>
                  <p className="text-[10.5px] text-slate-400 leading-normal">
                    Connect into real-time physical liftsplits from anywhere. Follow visual trainer alignments and engage alongside other members immediately.
                  </p>
                </div>

                {/* Schedules list */}
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Scheduled Streams Available</span>
                <div className="space-y-2.5">
                  {liveClasses.map(cls => (
                    <div key={cls.id} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 font-mono">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                          <h4 className="text-xs font-black text-white uppercase tracking-tight">{cls.title}</h4>
                        </div>
                        <span className="text-[9.5px] text-slate-500 block mt-1">Instructor Focus: Coach {cls.coach}</span>
                      </div>
                      <button
                        onClick={() => { setActiveClass(cls); setJoinedStream(true); }}
                        className="py-1.5 px-3 bg-red-600 hover:bg-red-550 text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        Join Stream
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================
            5. TRAINER DIRECTORY MATCHMAKER
            ========================================== */}
        {activeSub === "trainer" && (
          <div className="p-5 space-y-4">
            
            {/* Direct private message logs block */}
            {matchedTrainer ? (
              <div className="space-y-4">
                
                {/* Active Coach Identity details */}
                <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block">Active Assignment Match</span>
                      <h4 className="text-xs font-black text-white mt-0.5">
                        {trainerProfileList.find(t => t.id === matchedTrainer)?.name}
                      </h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMatchedTrainer("")}
                    className="text-[9.5px] text-slate-500 hover:text-white cursor-pointer"
                  >
                    Switch Coach
                  </button>
                </div>

                {/* Direct text consultation console */}
                <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-4 shadow-lg">
                  <div className="border-b border-white/5 pb-2 flex justify-between items-center text-[10px]">
                    <span className="text-purple-400 font-bold uppercase tracking-widest font-sans">Counselor Direct Hotline</span>
                    <span className="text-emerald-400 font-bold font-mono">● Active online</span>
                  </div>

                  {/* Logs list scrolling box */}
                  <div className="max-h-[170px] overflow-y-auto space-y-3 font-mono text-[11px] pr-1 select-none">
                    {trainerChatLogs.length > 0 ? (
                      trainerChatLogs.map((log, index) => (
                        <div key={index} className="leading-snug">
                          <span className={`font-black uppercase pr-1.5 ${
                            log.sender === "You" ? "text-amber-400" : "text-purple-300"
                          }`}>
                            {log.sender}:
                          </span>
                          <span className="text-slate-300 font-semibold">{log.text}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Send an initial text to start consult.</span>
                    )}
                  </div>

                  {/* Consulting form fields */}
                  <form onSubmit={handleSendTrainerMessage} className="flex gap-2">
                    <input 
                      type="text"
                      value={trainerInputMsg}
                      onChange={(e) => setTrainerInputMsg(e.target.value)}
                      placeholder="Inquire about lifts target weight or diets..."
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-purple-550"
                    />
                    <button 
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-550 text-white font-extrabold px-3.5 rounded-xl cursor-pointer active:scale-95 transition-transform"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-purple-950/30 via-purple-950/10 to-slate-955 rounded-3xl border border-purple-500/10 space-y-1.5">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Coaching matchdesk</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Expert Biomechanics Roster</h3>
                  <p className="text-[10.5px] text-slate-400 leading-normal">
                    Schedule check-ins and review structural movement posture form with certified pro athletes. Tap coordinates below to bind matching coach.
                  </p>
                </div>

                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Select certified trainer to bind</span>
                <div className="space-y-3">
                  {trainerProfileList.map(t => (
                    <div key={t.id} className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-3 shadow shadow-md select-none">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase">{t.name}</h4>
                          <span className="text-[9px] text-purple-400 font-bold mt-0.5 block">{t.specialty}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-300 py-0.5 px-2 bg-amber-950/20 border border-amber-500/10 rounded-lg">
                          {t.rating}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{t.bio}</p>
                      <button 
                        onClick={() => handleSelectCoach(t.id)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-550 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        Activate & Chat Consultation
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================
            6. GYM SOCIAL PEERS FEED & FOLLOWS
            ========================================== */}
        {activeSub === "social" && (
          <div className="p-5 space-y-5">
            
            {/* Peer matching directory list */}
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-3 shadow-lg">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block font-sans">Iron Gym Peer directory</span>
              
              <div className="divide-y divide-white/5 space-y-2.5">
                {[
                  { name: "Rohan Kumar", streak: "14 Days Day-Streak", specialty: "Heavy Powerlifter" },
                  { name: "Jessica Miller", streak: "10 Days Streak", specialty: "Athletic Cardio Core" },
                  { name: "Arjun Sharma", streak: "24 Days Streak", specialty: "Classic Bodybuilder" }
                ].map((member, i) => (
                  <div key={i} className="flex justify-between items-center pt-2.5 first:pt-0">
                    <div>
                      <h4 className="text-xs font-black text-white tracking-tight">{member.name}</h4>
                      <div className="flex gap-2 text-[9px] font-mono text-slate-500 mt-0.5">
                        <span className="text-emerald-400">{member.streak}</span>
                        <span>•</span>
                        <span>{member.specialty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(member.name)}
                      className={`py-1 px-3 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
                        followedUsers.includes(member.name)
                          ? "bg-slate-800 text-slate-400 border-white/10"
                          : "bg-emerald-600 hover:bg-emerald-550 text-white border-transparent"
                      }`}
                    >
                      {followedUsers.includes(member.name) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Gym activities feed */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Gym-grid public feed announcements</span>
              
              {/* Own fast publishing card */}
              <form onSubmit={handlePublishFeedPost} className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-2 flex gap-3 items-center">
                <input 
                  type="text"
                  required
                  value={ownSocialPostText}
                  onChange={(e) => setOwnSocialPostText(e.target.value)}
                  placeholder="Broadcast daily physical log lifts..."
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-emerald-505"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-550 text-white text-[10.5px] font-black uppercase py-2 px-4 rounded-xl cursor-pointer active:scale-95 transition-transform"
                >
                  Post
                </button>
              </form>

              {/* public post stack */}
              <div className="space-y-3">
                {socialFeed.map(post => (
                  <div key={post.id} className="bg-slate-900 border border-white/5 p-4 rounded-3xl space-y-2.5 font-sans shadow shadow-md">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h4 className="text-xs font-black text-white">{post.user}</h4>
                      {followedUsers.includes(post.user) && (
                        <span className="text-[8px] bg-slate-800 text-slate-400 py-0.5 px-1.5 rounded-full border border-white/5 font-bold uppercase tracking-wider">
                          Followed Peers
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal font-medium">{post.action}</p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheerClap(post.id)}
                        className={`flex items-center gap-1.5 py-1 px-3 rounded-lg border text-[9.5px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                          post.cheered 
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-550" 
                            : "bg-slate-950 text-slate-500 border-white/5 hover:text-slate-300"
                        }`}
                      >
                        👏 FIT CHEERS ({post.claps})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            7. ACHIEVEMENTS TROPHY LOCKERS
            ========================================== */}
        {activeSub === "badges" && (
          <div className="p-5 space-y-4">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 shadow space-y-3">
              <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block font-sans">Athletic gamification milestones</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Certified Merit lockers</h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Unlock gamified indicators by completing real fitness steps inside the platform. Complete tutorials, trigger AI recommendations, track reps, and sync steps.
              </p>
            </div>

            {/* Badges list grid layout */}
            <div className="grid grid-cols-2 gap-3.5 select-none">
              {achievementBadgesList.map(badge => (
                <div 
                  key={badge.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between space-y-3 relative group transition-all duration-300 ${
                    badge.keyStat 
                      ? "bg-slate-900/90 border-amber-500/20 shadow" 
                      : "bg-slate-950/60 border-white/5 opacity-40 hover:opacity-100"
                  }`}
                >
                  {badge.keyStat && (
                    <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400 blur-xs" />
                  )}

                  <div className="space-y-1">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                      badge.keyStat 
                        ? "bg-amber-500/15 border-amber-500/20 text-amber-400" 
                        : "bg-slate-900 border-transparent text-slate-600"
                    }`}>
                      <Award className="h-5 w-5" />
                    </div>
                    <h4 className={`text-xs font-black tracking-tight uppercase leading-snug pt-1 ${
                      badge.keyStat ? "text-white" : "text-slate-500"
                    }`}>
                      {badge.name}
                    </h4>
                    <p className="text-[9.5px] text-slate-500 leading-snug">{badge.desc}</p>
                  </div>

                  <div>
                    <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                      badge.keyStat 
                        ? "bg-amber-950/30 text-amber-300 border border-amber-500/10" 
                        : "bg-slate-900 text-slate-600"
                    }`}>
                      {badge.keyStat ? "Completed ✓" : "LOCKED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ==========================================
            8. VISION REPETITIVE COUNTER MODULE
            ========================================== */}
        {activeSub === "vision-counter" && (
          <div className="p-5 space-y-4">
            
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl grid grid-cols-2 gap-3 select-none">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-black">Tracking target focus</span>
                <select 
                  value={repChoice}
                  onChange={(e) => setRepChoice(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-1 px-2.5 text-xs text-white outline-none focus:border-cyan-505"
                >
                  <option>Pushups</option>
                  <option>Squats</option>
                  <option>Dumbbell Bicep Curl</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-black">Audio Rep buzzer</span>
                <button 
                  onClick={() => setSoundFeedback(!soundFeedback)}
                  className={`w-full py-1 text-xs font-black rounded-xl border transition-all ${
                    soundFeedback 
                      ? "bg-slate-950 text-emerald-400 border-emerald-500/20" 
                      : "bg-slate-950 text-slate-500 border-white/5"
                  }`}
                >
                  {soundFeedback ? "🔈 Sound ON" : "🔇 Sound MUTED"}
                </button>
              </div>
            </div>

            {/* Simulated AI camera overlay viewfinder frame */}
            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden aspect-square relative flex items-center justify-center shadow-lg group">
              
              {/* Optional live device camera feed */}
              {useCameraStream ? (
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-955 flex items-center justify-center select-none text-center p-4">
                  <div className="space-y-2">
                    <Camera className="h-10 w-10 text-cyan-500 mx-auto opacity-60" />
                    <p className="text-[10.5px] font-black text-slate-400 leading-normal uppercase">Digital Scanner sandbox</p>
                    <span className="text-[9px] text-slate-500 block leading-normal">
                      Click "Initiate Camera stream" to sync lens overlay, or tap "Override Simulated Rep" below to test calibrated increments.
                    </span>
                  </div>
                </div>
              )}

              {/* Layered calibration skeletal vector canvas overlay */}
              <canvas 
                ref={canvasElementRef}
                width={320}
                height={325}
                className="absolute inset-0 z-25 pointer-events-none w-full h-full"
              />

              {/* Calibration badge overlays */}
              <div className="absolute top-4 left-4 z-20">
                <span className="text-[8.5px] bg-cyan-600 text-white font-extrabold font-mono px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Vision API Active
                </span>
              </div>
              
              <div className="absolute bottom-4 right-4 z-20">
                <span className="text-[8.5px] bg-slate-900/90 text-slate-400 font-mono font-bold py-1 px-2.5 rounded-lg border border-white/10">
                  Target: {repChoice}
                </span>
              </div>

            </div>

            {/* Rep statistics display dashboard */}
            <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl flex justify-between items-center shadow shadow-md">
              <div className="space-y-1.5">
                <p className="text-[9.5px] text-slate-400 font-mono">CALIBRATION FEED STATUS</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-black uppercase text-white tracking-tight leading-none leading-normal">
                    {visionDetectStatus}
                  </span>
                </div>
              </div>

              {/* Tick metric */}
              <div className="bg-slate-950 border border-white/10 p-3 rounded-2xl text-center min-w-[70px] shrink-0 transform hover:scale-105 transition-all">
                <span className="text-[8.5px] font-black text-cyan-400 uppercase tracking-widest block font-mono">Count</span>
                <span className="text-2xl font-mono font-black text-white leading-none mt-1 inline-block">{repCount}</span>
              </div>
            </div>

            {/* Trigger switches */}
            <div className="grid grid-cols-2 gap-3 text-xs select-none">
              <button
                onClick={() => setUseCameraStream(!useCameraStream)}
                className={`py-2.5 rounded-xl text-[10.5px] font-black uppercase border transition-all cursor-pointer text-center ${
                  useCameraStream 
                    ? "bg-slate-800 text-slate-300 border-white/15" 
                    : "bg-cyan-600 hover:bg-cyan-550 text-white border-transparent shadow shadow-cyan-600/20"
                }`}
              >
                {useCameraStream ? "Stop Camera" : "Initiate Camera stream"}
              </button>

              <button
                onClick={handleSimulateRepTick}
                className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/15 hover:border-white/20 text-white font-black text-[10.5px] uppercase rounded-xl cursor-pointer text-center active:scale-95 transition-transform"
              >
                Override Simulated Rep
              </button>
            </div>

          </div>
        )}

        {/* ==========================================
            9. WEARABLE SYNC INTEGRATION LAB
            ========================================== */}
        {activeSub === "wearable" && (
          <div className="p-5 space-y-4 font-mono">
            
            {/* Swapping credentials widgets */}
            <div className="bg-slate-900 border border-white/5 p-5 rounded-3xl space-y-4 shadow-lg select-none">
              <div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block font-sans">Wearer synchronization portal</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Fitness Hub Syncer</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                
                {/* Apple Health provider match */}
                <button
                  onClick={() => handleToggleSyncWearable("apple")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-3 cursor-pointer transition-all ${
                    selectedProvider === "apple" 
                      ? "bg-rose-955/35 border-rose-500/35" 
                      : "bg-slate-950 border-white/5 hover:border-white/10"
                  }`}
                >
                  <Heart className={`h-6 w-6 ${selectedProvider === "apple" ? "text-rose-400 fill-rose-450 animate-bounce" : "text-rose-600"}`} />
                  <div>
                    <h4 className="text-xs font-black text-white">Apple Health</h4>
                    <span className="text-[9.5px] text-slate-400 block mt-0.5">
                      {selectedProvider === "apple" ? "AUTHORIZED VIP" : "Click to link"}
                    </span>
                  </div>
                </button>

                {/* Google Fit provider match */}
                <button
                  onClick={() => handleToggleSyncWearable("google")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-3 cursor-pointer transition-all ${
                    selectedProvider === "google" 
                      ? "bg-blue-955/35 border-blue-500/35" 
                      : "bg-slate-950 border-white/5 hover:border-white/10"
                  }`}
                >
                  <Zap className={`h-6 w-6 ${selectedProvider === "google" ? "text-cyan-400 fill-cyan-400 animate-bounce" : "text-blue-500"}`} />
                  <div>
                    <h4 className="text-xs font-black text-white">Google Fit</h4>
                    <span className="text-[9.5px] text-slate-400 block mt-0.5">
                      {selectedProvider === "google" ? "CONNECTED SECURE" : "Click to link"}
                    </span>
                  </div>
                </button>

              </div>
            </div>

            {/* Sync live results metrics */}
            {wearableSynced ? (
              <div className="space-y-4">
                
                {/* Synced physical logs card stack */}
                <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl grid grid-cols-2 gap-3 text-center">
                  
                  <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block font-sans">Synced Steps</span>
                    <h4 className="text-base font-black text-emerald-400 mt-1">{healthData.steps.toLocaleString()}</h4>
                    <span className="text-[8px] text-slate-500 block">Daily active</span>
                  </div>

                  <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block font-sans">Synced Energy</span>
                    <h4 className="text-base font-black text-orange-400 mt-1">{healthData.calories} kcal</h4>
                    <span className="text-[8px] text-slate-500 block">Active Burn</span>
                  </div>

                  <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block font-sans">Active minutes</span>
                    <h4 className="text-base font-black text-cyan-400 mt-1">{healthData.activeMinutes} mins</h4>
                    <span className="text-[8px] text-slate-500 block">Sustained lift cycle</span>
                  </div>

                  <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block font-sans">Sleep cycles</span>
                    <h4 className="text-base font-black text-purple-400 mt-1">{healthData.sleep}</h4>
                    <span className="text-[8px] text-slate-500 block">Recovery logs</span>
                  </div>

                </div>

                {/* Sleek, handcrafted custom SVG chart representing weekly trend step sync */}
                <div className="bg-slate-900 border border-white/5 p-5 rounded-3xl space-y-3 shadow shadow-md select-none">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase font-sans">Synced Step-Metrics Trend</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/20 py-0.5 px-2 rounded-lg border border-emerald-500/10">Avg 8,245 / day</span>
                  </div>

                  <div className="bg-slate-950 border border-white/5 p-2 rounded-2xl">
                    {/* Handcrafted responsive SVG bar chart */}
                    <svg viewBox="0 0 300 100" className="w-full h-auto">
                      {/* Gridlines */}
                      <line x1="20" y1="10" x2="280" y2="10" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                      <line x1="20" y1="50" x2="280" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                      <line x1="20" y1="80" x2="280" y2="80" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />

                      {/* Six-day columns of synced step values, sized dynamically */}
                      {[
                        { day: "Mon", val: 56, steps: "5,600" },
                        { day: "Tue", val: 84, steps: "8,400" },
                        { day: "Wed", val: 92, steps: "9,200" },
                        { day: "Thu", val: 78, steps: "7,800" },
                        { day: "Fri", val: 95, steps: "9,500" },
                        { day: "Sat", val: 110, steps: "11,000" }
                      ].map((item, idx) => {
                        const stepX = 40;
                        const x = 30 + idx * stepX;
                        // Height mapping inside bounds
                        const height = (item.val / 120) * 70;
                        const y = 80 - height;
                        return (
                          <g key={idx}>
                            {/* Bar item with gradient fill */}
                            <rect 
                              x={x} 
                              y={y} 
                              width="18" 
                              height={height} 
                              rx="3" 
                              fill={selectedProvider === "apple" ? "#f43f5e" : "#06b6d4"} 
                              opacity="0.85" 
                              className="hover:opacity-100 transition-opacity cursor-pointer"
                            />
                            
                            {/* Value tooltip when hovering */}
                            <text x={x + 9} y={y - 4} fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">
                              {item.steps}
                            </text>

                            {/* Label axis */}
                            <text x={x + 9} y="92" fill="#64748b" fontSize="6.5" textAnchor="middle" fontWeight="bold">
                              {item.day}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <p className="text-[9.5px] text-slate-500 text-center leading-normal font-sans">
                    🔄 Sync handles biometric secure sandboxes. Zero private parameters leak to remote frameworks.
                  </p>
                </div>

              </div>
            ) : (
              <span className="text-xs text-slate-500 py-6 text-center block">
                No active wearable synced. Sync a fitness client above to map visual statistics charts.
              </span>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
