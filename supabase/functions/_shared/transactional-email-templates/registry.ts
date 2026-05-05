/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingReceived } from './booking-received.tsx'
import { template as bookingAccepted } from './booking-accepted.tsx'
import { template as bookingDeclined } from './booking-declined.tsx'
import { template as bookingCompleted } from './booking-completed.tsx'
import { template as refundIssued } from './refund-issued.tsx'
import { template as invoiceSigned } from './invoice-signed.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-received': bookingReceived,
  'booking-accepted': bookingAccepted,
  'booking-declined': bookingDeclined,
  'booking-completed': bookingCompleted,
  'refund-issued': refundIssued,
  'invoice-signed': invoiceSigned,
}
