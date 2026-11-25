'use client';

import React, { useEffect } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

/**
 * Turnstile / Captcha Decommissioned Component
 * Automatically informs parent caller of successful verification with zero UI blockage.
 */
export function TurnstileCaptcha({
  onVerify,
}: TurnstileCaptchaProps) {
  useEffect(() => {
    onVerify('auto_verified');
  }, [onVerify]);

  return null;
}
