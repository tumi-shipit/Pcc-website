"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

function tokenFrom(value: string) { const match=value.trim().match(/(?:membership\/verify\/)?([0-9a-f]{8}-[0-9a-f-]{27})/i); return match?.[1] ?? null; }

export default function MembershipScanner() {
  const videoRef=useRef<HTMLVideoElement>(null); const streamRef=useRef<MediaStream|null>(null); const timerRef=useRef<number|null>(null);
  const [value,setValue]=useState(""); const [message,setMessage]=useState("Scan a PCC membership QR code or enter its verification link."); const [running,setRunning]=useState(false);
  function open(raw:string){const token=tokenFrom(raw);if(!token){setMessage("That is not a valid PCC membership code.");return}window.open(`/membership/verify/${token}`,"_blank","noopener,noreferrer")}
  async function start(){
    const BarcodeDetectorClass=(window as unknown as {BarcodeDetector?:new(options:{formats:string[]})=>Detector}).BarcodeDetector;
    if(!BarcodeDetectorClass){setMessage("Camera scanning is not supported in this browser. Paste the link or token below.");return}
    try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}const detector=new BarcodeDetectorClass({formats:["qr_code"]});setRunning(true);setMessage("Camera ready. Hold the QR code inside the frame.");const scan=async()=>{if(!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes[0]?.rawValue){stop();open(codes[0].rawValue);return}}catch{}timerRef.current=window.setTimeout(scan,350)};void scan()}catch{setMessage("Camera access was not available. Paste the verification link or token below.")}
  }
  function stop(){if(timerRef.current)window.clearTimeout(timerRef.current);streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;setRunning(false)}
  useEffect(()=>()=>stop(),[]);
  return <div className="grid gap-6 lg:grid-cols-[1fr_24rem]"><div className="overflow-hidden rounded-3xl border border-white/10 bg-black"><div className="relative aspect-video"><video ref={videoRef} muted playsInline className="h-full w-full object-cover"/><div className="pointer-events-none absolute inset-[15%] rounded-3xl border-2 border-red-500"/></div></div><aside className="rounded-3xl border border-white/10 bg-zinc-900 p-6"><h2 className="text-2xl font-black">Check a member</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p><button type="button" onClick={running?stop:()=>void start()} className="mt-6 w-full rounded-xl bg-red-700 px-5 py-3 text-sm font-black">{running?"Stop camera":"Start camera scanner"}</button><div className="my-5 h-px bg-white/10"/><label className="text-xs font-black uppercase tracking-wide text-zinc-400">Verification link or token<input value={value} onChange={e=>setValue(e.target.value)} placeholder="Paste code here" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"/></label><button type="button" onClick={()=>open(value)} className="mt-3 w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-black">Verify manually</button></aside></div>;
}
