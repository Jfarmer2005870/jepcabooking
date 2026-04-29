/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, brand, h1, text, buttonAccent, footer } from './_styles.ts'

interface Props {
  serviceName?: string
  businessName?: string
  reviewUrl?: string
}

const BookingCompleted = ({ serviceName, businessName, reviewUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>How was your Jepca service? Leave a review</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>How did it go?</Heading>
        <Text style={text}>
          Your booking{serviceName ? ` for "${serviceName}"` : ''}{businessName ? ` with ${businessName}` : ''} is marked complete. A quick review helps other customers and supports great providers.
        </Text>
        {reviewUrl && (
          <Button style={buttonAccent} href={reviewUrl}>Leave a review</Button>
        )}
        <Text style={footer}>Thanks for using Jepca.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingCompleted,
  subject: 'How was your Jepca service?',
  displayName: 'Booking completed',
  previewData: {
    serviceName: 'Deep house cleaning',
    businessName: 'Sparkle Pros',
    reviewUrl: 'https://jepcabooking.lovable.app/dashboard',
  },
} satisfies TemplateEntry
