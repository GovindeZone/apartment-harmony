# Apartment Harmony

Build a modern, professional Apartment Admin Management System for managing a residential apartment community.

The application should be designed as a responsive web application that works beautifully on:

Desktop

Tablet

Mobile

The system should have a clean, premium, modern property-management SaaS appearance. It should be extremely easy for an Apartment Facility Manager, Admin, Security Team and Help Desk staff to use.

1. MAIN APPLICATION STRUCTURE

Create a left-side navigation sidebar on desktop and a responsive mobile navigation.

Main navigation:

Dashboard

Staff

Security

Help Desk

Residents

Reports

Settings

The primary operational modules are:

A. STAFF

Manage all apartment staff and their employment information.

Staff section should contain:

Personal Records

Attendance

Salary Reports

B. SECURITY

Manage all apartment gate activities.

Create three gate sections:

IN Gate

Side Gate

OUT Gate

Security should record:

Residents

Vendors

Vehicles

Visitors / People

Entry and exit activity

C. HELP DESK

Create a WhatsApp-focused help-desk management system.

The system should record:

Resident WhatsApp number

Help Desk WhatsApp number

Facility Manager WhatsApp number

WhatsApp communication records

WhatsApp communication records should be stored in a cloud database / Google Sheet-compatible structure.

D. RESIDENTS

Maintain complete apartment resident information.

Include:

Owner / Tenant

Flat information

Family members

Vehicle information

Contact information

Stay / tenure information

Building / zone information

2. DASHBOARD

Create a visually attractive Admin Dashboard.

The dashboard should provide an immediate daily snapshot.

Important dashboard cards:

Total Staff

Staff Present Today

Staff Absent Today

Guest Count Today

Vehicles Entered Today

Visitors Currently Inside

Occupied Flats

Vacated Flats

Total Flats

Tenants

Owners

Include charts and visual summaries where appropriate.

For example:

Daily staff attendance chart

Guest/visitor trend

Gate entry activity

Occupied vs Vacant flats

Staff attendance summary

Use clear status indicators and colors, but keep the interface professional rather than overly colorful.

3. STAFF UI

Create a Staff Management page with:

Staff list

Search

Filter

Add Staff

Edit Staff

View Staff

Staff status

Attendance

Salary information

Staff profile should use a professional profile/details layout.

4. SECURITY UI

Create a Security Management interface optimized for fast data entry.

The security team should be able to quickly record gate movements.

Create separate interfaces for:

IN GATE

Record incoming:

Resident

Vendor

Visitor

Vehicle

Person

SIDE GATE

Same functionality as required for the side gate.

OUT GATE

Record outgoing:

Resident

Vendor

Visitor

Vehicle

Person

Display today's gate activity in a table/timeline.

Include:

Date

Time

Gate

Entry / Exit

Category

Person

Flat

Vehicle

Vehicle Number

5. HELP DESK UI

Create a simple WhatsApp-centric Help Desk.

The interface should make it easy to:

Search resident

Select resident

View WhatsApp number

Contact resident

Contact Facility Manager

Record communication

View communication history

Keep the interface extremely simple for daily operational use.

6. RESIDENT MANAGEMENT UI

Create a Residents section with:

Resident directory

Flat directory

Owner / Tenant filters

Zone filter

Block filter

Floor filter

Vehicle search

Phone search

WhatsApp search / LLM Search

Each resident should have a detailed profile page.

7. REPORTS

Create a Reports section with a professional reporting interface and scheduler

Reports should eventually support:

Staff Attendance Report

Staff Salary Report

Gate Entry Report

Gate Exit Report

Guest Report

Resident Report

Vehicle Report

Vacant Flat Report

Occupied Flat Report

Help Desk / WhatsApp Report

Provide date filtering and export capability.

8. SETTINGS

Create an Admin Settings section for:

Apartment information

Blocks

Zones

Floors

Flats

Gates

Staff shifts

User roles

Notification settings

WhatsApp configuration

Database configuration

9. DESIGN LANGUAGE

Use a premium modern SaaS design.

Design principles:

Clean white/light background

Professional typography

Rounded cards

Subtle shadows

Excellent spacing

Clear hierarchy

Responsive tables

Modern icons

Easy-to-understand status badges

Professional charts

The application should feel like a professionally developed Apartment Facility Management SaaS product, not a basic CRUD application.

10. IMPORTANT UX PRINCIPLE

The system will be used daily by apartment administrators and security personnel.

Therefore prioritize:

Speed

Simplicity

Minimal clicks

Large touch-friendly controls

Fast search

Quick data entry

Clear status indicators

Mobile responsiveness

Security staff should be able to record an entry in only a few seconds.

11. TECHNICAL ARCHITECTURE

Build the application using a scalable architecture suitable for production.

Use:

Component-based UI

Reusable components

Proper database relationships

Secure authentication

Role-based access control

Cloud database

Audit-friendly records

Responsive design

Design the database so that Residents, Family Members, Vehicles, Staff, Attendance, Salary, Gate Entries and Help Desk records are properly related.

Do not create unnecessary complexity in the first version.

First establish the complete navigation, page structure, dashboard, UI system and database foundation.

After completing this stage, the application should have a polished working shell ready for detailed feature implementation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d5a5d0e-81fd-4b61-9c6e-9c4a73a3ff30).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
