"use client";

import { useEffect } from "react";
import { getUserId } from "../src/lib/miaUser";

export default function EnsureUserId() {
  useEffect(() => {
    getUserId();
  }, []);

  return null;
}