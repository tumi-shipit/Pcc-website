// Path: components/admin/AdminModuleCard.tsx
import Link from "next/link";

export default function AdminModuleCard({
  title, description, href, count, color="red"
}:{
  title:string; description:string; href:string; count?:number|string; color?:"red"|"green"|"blue"|"yellow";
}){
  const accents={red:"border-red-500/40 text-red-300",green:"border-green-500/40 text-green-300",blue:"border-blue-500/40 text-blue-300",yellow:"border-yellow-500/40 text-yellow-300"};
  return(
    <Link href={href} className={`block rounded-3xl border bg-zinc-900 p-6 transition hover:-translate-y-1 ${accents[color]}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-white">{title}</h3>
        {count!==undefined && <span className="text-3xl font-black">{count}</span>}
      </div>
      <p className="mt-3 text-sm text-gray-400">{description}</p>
    </Link>
  );
}
