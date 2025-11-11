-- TeachWise Database Schema (Simplified - Users Only)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jaelyccdavvorfxpucdb/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.users CASCADE;

-- Users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_users_email ON public.users(email);
