"use client";

import { useEffect } from "react";

/** サービスワーカーを登録（本番のみ） */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 登録失敗は無視（PWAは任意機能） */
      });
    };
    // すでに読み込み完了していれば即時登録、そうでなければload時に登録
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
