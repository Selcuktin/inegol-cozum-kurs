import React, { lazy, Suspense } from "react";
import { AuthGuard } from "./AuthGuard";
const LgsModule=lazy(()=>import('../modules/lgs/LgsModule'));
export function ExamOpticalPage({me}){return <AuthGuard me={me} action="page_users"><div data-testid="exam-optical-page-container"><Suspense fallback={<p>Deneme analizi yükleniyor…</p>}><LgsModule/></Suspense></div></AuthGuard>;}
export default ExamOpticalPage;
