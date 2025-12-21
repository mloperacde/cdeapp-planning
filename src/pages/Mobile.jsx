import React from 'react';
import MobileHome from "./MobileHome";
import ErrorBoundary from "../components/common/ErrorBoundary";

export default function Mobile() {
  return (
    <ErrorBoundary>
      <MobileHome />
    </ErrorBoundary>
  );
}