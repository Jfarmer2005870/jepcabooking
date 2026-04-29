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
  totalPrice?: string
}

const BookingReceived = ({ serviceName, businessName, scheduledDate, scheduledTime, serviceAddress, totalPrice }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your booking request on Jepca</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>Booking request received</Heading>
        <Text style={text}>
          Thanks for booking with Jepca. {businessName ? `${businessName} has` : 'The provider has'} been notified and has up to 24 hours to accept. Your card is authorized but not yet charged.
        </Text>
        <div style={card}>
          {serviceName && <Text style={detailRow}><span style={label}>Service: </span>{serviceName}</Text>}
          {businessName && <Text style={detailRow}><span style={label}>Provider: </span>{businessName}</Text>}
          {scheduledDate && <Text style={detailRow}><span style={label}>Date: </span>{scheduledDate}{scheduledTime ? ` at ${scheduledTime}` : ''}</Text>}
          {serviceAddress && <Text style={detailRow}><span style={label}>Address: </span>{serviceAddress}</Text>}
          {totalPrice && <Text style={detailRow}><span style={label}>Total: </span>${totalPrice}</Text>}
        </div>
        <Text style={text}>We'll email you again as soon as the provider responds.</Text>
        <Text style={footer}>You're receiving this because you booked a service on Jepca.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingReceived,
  subject: 'Your Jepca booking request',
  displayName: 'Booking received',
  previewData: {
    serviceName: 'Deep house cleaning',
    businessName: 'Sparkle Pros',
    scheduledDate: 'Mon, May 5, 2026',
    scheduledTime: '10:00 AM',
    serviceAddress: '123 Main St, Austin, TX',
    totalPrice: '157.50',
  },
} satisfies TemplateEntry
