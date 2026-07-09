// Path: components/admin/AdminSearchBar.tsx
"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function AdminSearchBar(){
 const [q,setQ]=useState("");
 const r=useRouter();
 return(
 <form onSubmit={e=>{e.preventDefault(); if(q.trim()) r.push(`/admin/search?q=${encodeURIComponent(q)}`);}} className="flex gap-3">
 <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search players, tournaments, news..." className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"/>
 <button className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Search</button>
 </form>);
}
