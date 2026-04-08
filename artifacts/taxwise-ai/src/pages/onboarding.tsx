import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGuestSession } from "@/hooks/use-guest-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit,
  FileText,
  Upload,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Home,
  Heart,
  Banknote,
  User,
  X,
  Loader2,
  ExternalLink,
  Pen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
};

const DOC_CATEGORIES = [
  {
    id: "w2",
    label: "W-2 Forms",
    icon: Briefcase,
    description: "From each employer for the tax year",
    required: true,
  },
  {
    id: "1099",
    label: "1099 Forms",
    icon: TrendingUp,
    description: "Freelance, gig work, investments, crypto",
    required: false,
  },
  {
    id: "deductions",
    label: "Deduction Records",
    icon: Heart,
    description: "Donations, medical, mortgage interest receipts",
    required: false,
  },
  {
    id: "id",
    label: "Government ID",
    icon: User,
    description: "Driver's license or passport (you & dependents)",
    required: false,
  },
  {
    id: "bank",
    label: "Bank Info",
    icon: Banknote,
    description: "Routing & account numbers for direct deposit",
    required: false,
  },
  {
    id: "other",
    label: "Other Documents",
    icon: FileText,
    description: "Any additional tax records",
    required: false,
  },
];

// ── Step 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex justify-center"
      >
        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
          <BrainCircuit className="h-10 w-10 text-primary" />
        </div>
      </motion.div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Welcome to TaxWise AI</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Let's get your taxes done right. Here's what you'll need to gather before we begin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
        {DOC_CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card"
          >
            <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
              <cat.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium flex items-center gap-1">
                {cat.label}
                {cat.required && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-green-500" />
        <span>Bank-level 256-bit encryption. Your data is never sold.</span>
      </div>

      <Button size="lg" onClick={onNext} className="px-8">
        Get Started <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 2: Document Upload ──────────────────────────────────────────────────
function StepDocuments({
  onNext,
  onBack,
  files,
  setFiles,
}: {
  onNext: () => void;
  onBack: () => void;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}) {
  const [dragging, setDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("w2");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function processFiles(fileList: FileList, category: string) {
    setProcessing(true);
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).substring(2),
      name: f.name,
      size: f.size,
      type: f.type,
      category,
    }));
    setTimeout(() => {
      setFiles((prev) => [...prev, ...newFiles]);
      setProcessing(false);
      toast({
        title: "Documents processed",
        description: `${newFiles.length} file(s) analyzed by AI OCR.`,
      });
    }, 1200);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files, selectedCategory);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const hasW2 = files.some((f) => f.category === "w2");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Upload Your Documents</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Our AI OCR will automatically extract the required information from your documents.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOC_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.heic,.tiff"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files, selectedCategory)}
        />
        {processing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">AI OCR analyzing documents…</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              Drop files here or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, HEIC, TIFF</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded ({files.length})
          </p>
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg"
            >
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_CATEGORIES.find((c) => c.id === f.category)?.label} ·{" "}
                  {(f.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasW2 && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>At least one W-2 form is required for most tax returns. You can add it now or manually enter the data later.</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext}>
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Personal Info + Identity ─────────────────────────────────────────
type PersonalInfo = {
  ssn: string;
  itin: string;
  routingNumber: string;
  accountNumber: string;
  signature: string;
  spouseSsn: string;
  filingStatus: string;
};

function StepPersonalInfo({
  onNext,
  onBack,
  info,
  setInfo,
}: {
  onNext: () => void;
  onBack: () => void;
  info: PersonalInfo;
  setInfo: React.Dispatch<React.SetStateAction<PersonalInfo>>;
}) {
  const [errors, setErrors] = useState<Partial<PersonalInfo>>({});

  function formatSSN(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function formatRouting(val: string) {
    return val.replace(/\D/g, "").slice(0, 9);
  }

  function validate(): boolean {
    const errs: Partial<PersonalInfo> = {};
    const ssnDigits = info.ssn.replace(/\D/g, "");
    if (info.ssn && ssnDigits.length !== 9) errs.ssn = "SSN must be 9 digits";
    if (info.routingNumber && info.routingNumber.length !== 9) errs.routingNumber = "Routing number must be 9 digits";
    if (!info.signature.trim()) errs.signature = "Signature is required to proceed";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Personal & Banking Information</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Required for filing and direct deposit. All data is encrypted end-to-end.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ssn">
            SSN <span className="text-muted-foreground text-xs">(or leave blank)</span>
          </Label>
          <Input
            id="ssn"
            placeholder="XXX-XX-XXXX"
            value={info.ssn}
            onChange={(e) => setInfo((p) => ({ ...p, ssn: formatSSN(e.target.value) }))}
            className={errors.ssn ? "border-destructive" : ""}
          />
          {errors.ssn && <p className="text-xs text-destructive">{errors.ssn}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="itin">
            ITIN <span className="text-muted-foreground text-xs">(if no SSN)</span>
          </Label>
          <Input
            id="itin"
            placeholder="9XX-XX-XXXX"
            value={info.itin}
            onChange={(e) => setInfo((p) => ({ ...p, itin: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filing-status">Filing Status</Label>
          <select
            id="filing-status"
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            value={info.filingStatus}
            onChange={(e) => setInfo((p) => ({ ...p, filingStatus: e.target.value }))}
          >
            <option value="single">Single</option>
            <option value="married_filing_jointly">Married Filing Jointly</option>
            <option value="married_filing_separately">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
            <option value="qualifying_widow">Qualifying Widow(er)</option>
          </select>
        </div>

        {info.filingStatus === "married_filing_jointly" && (
          <div className="space-y-1.5">
            <Label htmlFor="spouse-ssn">Spouse SSN / ITIN</Label>
            <Input
              id="spouse-ssn"
              placeholder="XXX-XX-XXXX"
              value={info.spouseSsn}
              onChange={(e) => setInfo((p) => ({ ...p, spouseSsn: formatSSN(e.target.value) }))}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="routing">Bank Routing Number (for direct deposit)</Label>
          <Input
            id="routing"
            placeholder="9-digit routing number"
            value={info.routingNumber}
            onChange={(e) => setInfo((p) => ({ ...p, routingNumber: formatRouting(e.target.value) }))}
            className={errors.routingNumber ? "border-destructive" : ""}
          />
          {errors.routingNumber && (
            <p className="text-xs text-destructive">{errors.routingNumber}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account">Bank Account Number</Label>
          <Input
            id="account"
            placeholder="Checking or savings account"
            value={info.accountNumber}
            onChange={(e) => setInfo((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 17) }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signature" className="flex items-center gap-1">
          <Pen className="h-3.5 w-3.5" />
          Signature <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">Required</Badge>
        </Label>
        <Input
          id="signature"
          placeholder="Type your full legal name as your signature"
          value={info.signature}
          onChange={(e) => setInfo((p) => ({ ...p, signature: e.target.value }))}
          className={cn("font-serif italic text-lg", errors.signature ? "border-destructive" : "")}
        />
        {errors.signature && <p className="text-xs text-destructive">{errors.signature}</p>}
        <p className="text-xs text-muted-foreground">
          By typing your name, you confirm the information provided is accurate and complete under penalties of perjury.
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={handleNext}>
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Terms of Service + Submit ────────────────────────────────────────
function StepTermsAndSubmit({
  onBack,
  onComplete,
  info,
}: {
  onBack: () => void;
  onComplete: () => void;
  info: PersonalInfo;
}) {
  const [tosAccepted, setTosAccepted] = useState(false);
  const [wantsPrint, setWantsPrint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<null | { confirmationNumber: string; estimatedRefund: number; estimatedOwed: number }>(null);
  const [iframeVisible, setIframeVisible] = useState(false);
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (!tosAccepted) {
      toast({ variant: "destructive", title: "Please accept the Terms of Service" });
      return;
    }
    setSubmitted(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitResult({
      confirmationNumber: `TW-2024-DEMO-${Date.now().toString(36).toUpperCase()}`,
      estimatedRefund: 1243.5,
      estimatedOwed: 0,
    });
    onComplete();
  }, [tosAccepted, onComplete, toast]);

  if (submitResult) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Return Submitted!</h2>
        <p className="text-muted-foreground">
          Confirmation <strong className="font-mono text-foreground">{submitResult.confirmationNumber}</strong>
        </p>
        {submitResult.estimatedRefund > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${submitResult.estimatedRefund.toFixed(2)} Refund
            </p>
            <p className="text-sm text-muted-foreground mt-1">Expected via direct deposit within 21 days</p>
          </div>
        )}
        <Button onClick={onComplete} size="lg">Go to Dashboard</Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Review & Submit</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Read and agree to the terms before submitting your return to the IRS.
        </p>
      </div>

      <div className="p-4 bg-muted/40 rounded-xl text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Filer</span>
          <span className="font-medium">{info.signature || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Filing Status</span>
          <span className="font-medium capitalize">{info.filingStatus.replace(/_/g, " ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Direct Deposit</span>
          <span className="font-medium">{info.routingNumber ? "Configured" : "Not set"}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">IRS Terms of Service</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIframeVisible((v) => !v)}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {iframeVisible ? "Hide" : "View"} Terms
          </Button>
        </div>

        <AnimatePresence>
          {iframeVisible && (
            <motion.div
              initial={{ x: "60%", y: "-20%", rotate: 15, opacity: 0, scale: 0.3 }}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
              exit={{ x: "60%", y: "-20%", rotate: 15, opacity: 0, scale: 0.3 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
                mass: 0.8,
              }}
              className="overflow-hidden rounded-xl border shadow-lg"
            >
              <iframe
                src="https://www.irs.gov/privacy-disclosure/irs-privacy-policy"
                title="IRS Privacy Policy & Terms"
                className="w-full h-64 bg-white"
                sandbox="allow-same-origin"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Checkbox
            id="tos"
            checked={tosAccepted}
            onCheckedChange={(v) => setTosAccepted(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="tos" className="text-sm leading-relaxed cursor-pointer">
            I declare that I have examined this return and accompanying schedules and statements, and to
            the best of my knowledge and belief, they are true, correct, and complete. I understand that
            by checking this box I am signing and submitting this tax return under penalties of perjury.
          </Label>
        </div>

        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Checkbox
            id="print"
            checked={wantsPrint}
            onCheckedChange={(v) => setWantsPrint(v === true)}
          />
          <Label htmlFor="print" className="text-sm cursor-pointer">
            I'd also like a printable PDF copy to mail to the IRS myself.
          </Label>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={submitted}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <motion.div
          animate={
            tosAccepted
              ? { y: [0, -4, 0], transition: { repeat: 2, duration: 0.3 } }
              : {}
          }
        >
          <Button
            size="lg"
            disabled={!tosAccepted || submitted}
            onClick={handleSubmit}
            className={cn(
              "transition-all duration-300",
              tosAccepted ? "opacity-100 shadow-lg shadow-primary/30" : "opacity-50"
            )}
          >
            {submitted ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting to IRS…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Submit Return to IRS
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ── Main Onboarding Page ──────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    ssn: "",
    itin: "",
    routingNumber: "",
    accountNumber: "",
    signature: "",
    spouseSsn: "",
    filingStatus: "single",
  });
  const { markOnboardingComplete } = useGuestSession();
  const [, navigate] = useLocation();

  function handleComplete() {
    markOnboardingComplete();
    navigate("/");
  }

  const stepVariants = {
    enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  function next() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-medium text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </h1>
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Skip for now
            </button>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {step === 1 && <StepWelcome onNext={next} />}
                {step === 2 && (
                  <StepDocuments
                    onNext={next}
                    onBack={back}
                    files={files}
                    setFiles={setFiles}
                  />
                )}
                {step === 3 && (
                  <StepPersonalInfo
                    onNext={next}
                    onBack={back}
                    info={personalInfo}
                    setInfo={setPersonalInfo}
                  />
                )}
                {step === 4 && (
                  <StepTermsAndSubmit
                    onBack={back}
                    onComplete={handleComplete}
                    info={personalInfo}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
