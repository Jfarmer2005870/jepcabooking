/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, brand, h1, text, card, detailRow, label, footer } from './_styles.ts'

interface Props {
  serviceName?: string
  businessName?: string
  scheduledDate?: string
  scheduledTime?: string
  serviceAddress?: string
}

const BookingAccepted = ({ serviceName, businessName, scheduledDate, scheduledTime, serviceAddress }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Jepca booking is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>Your booking is confirmed 🎉</Heading>
        <Text style={text}>
          {businessName ? `${businessName} accepted your booking` : 'Your booking has been accepted'}. Your card has been charged and the appointment is locked in.
        </Text>
        <div style={card}>
          {serviceName && <Text style={detailRow}><span style={label}>Service: </span>{serviceName}</Text>}
          {businessName && <Text style={detailRow}><span style={label}>Provider: </span>{businessName}</Text>}
          {scheduledDate && <Text style={detailRow}><span style={label}>Date: </span>{scheduledDate}{scheduledTime ? ` at ${scheduledTime}` : ''}</Text>}
          {serviceAddress && <Text style={detailRow}><span style={label}>Address: </span>{serviceAddress}</Text>}
        </div>
        <Text style={text}>You can chat with your provider and manage the booking from your dashboard.</Text>
        <Text style={footer}>Need to reschedule? Reach out via the chat in your Jepca dashboard.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingAccepted,
  subject: 'Your Jepca booking is confirmed',
  displayName: 'Booking accepted',
  previewData: {
    serviceName: 'Deep house cleaning',
    businessName: 'Sparkle Pros',
    scheduledDate: 'Mon, May 5, 2026',
    scheduledTime: '10:00 AM',
    serviceAddress: '123 Main St, Austin, TX',
  },
} satisfies TemplateEntry
