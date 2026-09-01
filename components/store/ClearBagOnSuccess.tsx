"use client";

import { useEffect, useRef } from "react";
import { useStoreCart } from "@/components/store/StoreCart";

export default function ClearBagOnSuccess() {
  const { clear } = useStoreCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    localStorage.removeItem("pcc-store-bag-v1");
    queueMicrotask(clear);
  }, [clear]);

  return null;
}
