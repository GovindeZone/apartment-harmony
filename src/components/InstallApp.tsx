import { useEffect, useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    update();
    standalone.addEventListener("change", update);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    return () => {
      standalone.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  async function install() {
    if (!prompt) { setOpen(true); return; }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { setPrompt(null); setOpen(true); }
  }

  return (
    <>
      <Button variant="ghost" disabled={installed} onClick={install} className="mt-3 h-auto min-h-11 w-full justify-start gap-3 whitespace-normal border-t border-border/60 px-3 py-3 text-left text-sm text-sidebar-foreground">
        {installed ? <Check className="size-[18px] shrink-0" /> : <Smartphone className="size-[18px] shrink-0" />}
        <span>{installed ? "App installed" : "Install Mobile App"}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Install Indus Anantya</DialogTitle>
            <DialogDescription>Add the apartment app to your home screen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Share className="size-5 text-primary" />
              <div><h3 className="font-semibold">iPhone or iPad</h3><p className="mt-1 text-muted-foreground">Open this site in Safari, tap Share, then Add to Home Screen and Add.</p></div>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Download className="size-5 text-primary" />
              <div><h3 className="font-semibold">Android or desktop</h3><p className="mt-1 text-muted-foreground">Open this site in Chrome or Edge. In the browser menu, choose Install app or Add to Home screen.</p></div>
            </div>
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">Use the live website outside the editor preview. Internet access is required.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}