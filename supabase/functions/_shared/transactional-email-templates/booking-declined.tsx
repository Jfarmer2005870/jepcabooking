/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, brand, h1, text, footer } from './_styles.ts'

interface Props {
  serviceName?: string
  businessName?: string
}

const BookingDeclined = ({ serviceName, businessName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Jepca booking wasn't accepted — no charge made</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>Your booking wasn't accepted</Heading>
        <Text style={text}>
          Unfortunately {businessName || 'the provider'} couldn't take your booking{serviceName ? ` for "${serviceName}"` : ''}. You haven't been charged — the payment hold has been released.
        </Text>
        <Text style={text}>
          Browse other trusted providers on Jepca and book again in a few taps.
        </Text>
        <Text style={footer}>Questions? Reply to this email and our team will help.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingDeclined,
  subject: 'Your Jepca booking wasn\'t accepted',
  displayName: 'Booking declined',
  previewData: {
    serviceName: 'Deep house cleaning',
    businessName: 'Sparkle Pros',
  },
} satisfies TemplateEntry
