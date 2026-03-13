--
-- PostgreSQL database dump
--

\restrict 5ifQHSQATbvZcTtprLYc2Y5bPbexC2ZfRScI7RyBgaizEbo9qTKlLCuZCxf7JT2

-- Dumped from database version 15.16
-- Dumped by pg_dump version 15.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: InvestigationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvestigationStatus" AS ENUM (
    'PRELIMINARY',
    'FINAL',
    'AMENDED',
    'PROCESSING'
);


ALTER TYPE public."InvestigationStatus" OWNER TO postgres;

--
-- Name: NoteType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NoteType" AS ENUM (
    'ADMISSION',
    'PROGRESS',
    'PROCEDURE',
    'DISCHARGE',
    'NURSING',
    'CONSULT',
    'OTHER'
);


ALTER TYPE public."NoteType" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'COMPLETED',
    'DISCONTINUED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: OrderType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderType" AS ENUM (
    'MEDICATION',
    'LAB',
    'IMAGING',
    'PROTOCOL',
    'NURSING',
    'DIET',
    'CONSULT',
    'PROCEDURE',
    'BLOOD_PRODUCT'
);


ALTER TYPE public."OrderType" OWNER TO postgres;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Priority" AS ENUM (
    'ROUTINE',
    'URGENT',
    'STAT'
);


ALTER TYPE public."Priority" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'SENIOR',
    'RESIDENT',
    'NURSE'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: ShiftType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ShiftType" AS ENUM (
    'DAY',
    'NIGHT'
);


ALTER TYPE public."ShiftType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admission" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    bed text,
    diagnosis text,
    "doctorId" text,
    "specialtyId" text,
    "admittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dischargedAt" timestamp(3) without time zone
);


ALTER TABLE public."Admission" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action text NOT NULL,
    details text,
    "userId" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: ClinicalNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClinicalNote" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "authorId" text NOT NULL,
    type public."NoteType" NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    data jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicalNote" OWNER TO postgres;

--
-- Name: ClinicalOrder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClinicalOrder" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "authorId" text NOT NULL,
    "approverId" text,
    type public."OrderType" NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    priority public."Priority" DEFAULT 'ROUTINE'::public."Priority" NOT NULL,
    title text NOT NULL,
    details jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reminderAt" timestamp(3) without time zone,
    "reminderSent" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."ClinicalOrder" OWNER TO postgres;

--
-- Name: Consultation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Consultation" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "authorId" text NOT NULL,
    "doctorName" text NOT NULL,
    specialty text NOT NULL,
    "imageUrl" text,
    notes text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "orderId" text
);


ALTER TABLE public."Consultation" OWNER TO postgres;

--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    name text NOT NULL,
    "specialtyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Doctor" OWNER TO postgres;

--
-- Name: DrugCatalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DrugCatalog" (
    id text NOT NULL,
    name text NOT NULL,
    "defaultDose" text,
    "defaultRoute" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DrugCatalog" OWNER TO postgres;

--
-- Name: Governorate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Governorate" (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Governorate" OWNER TO postgres;

--
-- Name: IntakeOutput; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IntakeOutput" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "userId" text NOT NULL,
    "shiftId" text,
    type text NOT NULL,
    category text NOT NULL,
    amount double precision NOT NULL,
    notes text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pendingValue" double precision,
    status text DEFAULT 'APPROVED'::text NOT NULL
);


ALTER TABLE public."IntakeOutput" OWNER TO postgres;

--
-- Name: Investigation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Investigation" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "orderId" text,
    "authorId" text NOT NULL,
    type public."OrderType" NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    status public."InvestigationStatus" DEFAULT 'FINAL'::public."InvestigationStatus" NOT NULL,
    result jsonb,
    impression text,
    "conductedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "externalId" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pdfFilename" text
);


ALTER TABLE public."Investigation" OWNER TO postgres;

--
-- Name: Medication; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Medication" (
    id text NOT NULL,
    name text NOT NULL,
    "defaultDose" text NOT NULL,
    route text NOT NULL,
    frequency text,
    "infusionRate" text,
    "otherInstructions" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "patientId" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dilution double precision,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "durationReminder" integer,
    "discontinuedAt" timestamp(3) without time zone
);


ALTER TABLE public."Medication" OWNER TO postgres;

--
-- Name: MedicationAdministration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MedicationAdministration" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "medicationId" text NOT NULL,
    status text NOT NULL,
    dose text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text,
    dilution double precision
);


ALTER TABLE public."MedicationAdministration" OWNER TO postgres;

--
-- Name: NurseCheckIn; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NurseCheckIn" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "userId" text NOT NULL,
    "shiftId" text,
    "airwaySafe" boolean DEFAULT true NOT NULL,
    "breathingOk" boolean DEFAULT true NOT NULL,
    "circulationOk" boolean DEFAULT true NOT NULL,
    notes text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."NurseCheckIn" OWNER TO postgres;

--
-- Name: Patient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    mrn text NOT NULL,
    name text NOT NULL,
    dob timestamp(3) without time zone NOT NULL,
    gender text NOT NULL,
    comorbidities text[] DEFAULT ARRAY[]::text[],
    diagnosis text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Patient" OWNER TO postgres;

--
-- Name: PatientAssignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PatientAssignment" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "userId" text NOT NULL,
    "shiftId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "isPending" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PatientAssignment" OWNER TO postgres;

--
-- Name: Shift; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Shift" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."ShiftType" NOT NULL,
    "startTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endTime" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Shift" OWNER TO postgres;

--
-- Name: SkinAssessment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SkinAssessment" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "authorId" text NOT NULL,
    "bodyPart" text NOT NULL,
    view text NOT NULL,
    type text NOT NULL,
    "imageUrl" text,
    notes text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SkinAssessment" OWNER TO postgres;

--
-- Name: SpecialistNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SpecialistNote" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "authorId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "shiftType" text,
    "apacheScore" text,
    "histHT" boolean DEFAULT false NOT NULL,
    "histDM" boolean DEFAULT false NOT NULL,
    "histAsthma" boolean DEFAULT false NOT NULL,
    "histCOPD" boolean DEFAULT false NOT NULL,
    "histIHD" boolean DEFAULT false NOT NULL,
    "histStroke" boolean DEFAULT false NOT NULL,
    "histOther" text,
    "neuroGCS" text,
    "neuroRASS" text,
    "respChest" text,
    "respRoomAir" boolean DEFAULT false NOT NULL,
    "respO2Therapy" boolean DEFAULT false NOT NULL,
    "respVentMode" boolean DEFAULT false NOT NULL,
    "respVentModeText" text,
    "respFio2" text,
    "respPS" text,
    "intCVLine" boolean DEFAULT false NOT NULL,
    "intArtLine" boolean DEFAULT false NOT NULL,
    "intETT" boolean DEFAULT false NOT NULL,
    "intTrach" boolean DEFAULT false NOT NULL,
    "intDoubleLumen" boolean DEFAULT false NOT NULL,
    "hydNormovolemia" boolean DEFAULT false NOT NULL,
    "hydHypervolemia" boolean DEFAULT false NOT NULL,
    "hydHypovolemia" boolean DEFAULT false NOT NULL,
    "hydUOP" text,
    "hydIVC" text,
    "hydCVP" text,
    "hemoStable" boolean DEFAULT false NOT NULL,
    "hemoUnstable" boolean DEFAULT false NOT NULL,
    "hemoVasopressor" boolean DEFAULT false NOT NULL,
    "feedOral" boolean DEFAULT false NOT NULL,
    "feedNG" boolean DEFAULT false NOT NULL,
    "feedTPN" boolean DEFAULT false NOT NULL,
    "feedRate" text,
    "ivFluidsRate" text,
    "sedPropofol" boolean DEFAULT false NOT NULL,
    "sedKetamine" boolean DEFAULT false NOT NULL,
    "sedMidazolam" boolean DEFAULT false NOT NULL,
    "sedRemif" boolean DEFAULT false NOT NULL,
    "sedMR" boolean DEFAULT false NOT NULL,
    "sedOther" text,
    "clinicalNotes" text,
    "planVentilatory" text,
    "planPhysio" text,
    "planConsult" text,
    "planInvestigation" text,
    "planOther" text,
    "planFuture" text,
    "planHomeTeam" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SpecialistNote" OWNER TO postgres;

--
-- Name: Specialty; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Specialty" (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Specialty" OWNER TO postgres;

--
-- Name: SyncLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SyncLog" (
    id text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    message text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "resultsCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."SyncLog" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dismissedLabs" text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: VentilatorSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VentilatorSetting" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "userId" text NOT NULL,
    mode text NOT NULL,
    rate integer NOT NULL,
    fio2 integer NOT NULL,
    ie text NOT NULL,
    ps integer NOT NULL,
    vt integer NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VentilatorSetting" OWNER TO postgres;

--
-- Name: VitalSign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VitalSign" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "heartRate" integer,
    "bpSys" integer,
    "bpDia" integer,
    spo2 integer,
    temp double precision,
    rbs double precision,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "imageUrl" text,
    rr integer
);


ALTER TABLE public."VitalSign" OWNER TO postgres;

--
-- Data for Name: Admission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admission" (id, "patientId", bed, diagnosis, "doctorId", "specialtyId", "admittedAt", "dischargedAt") FROM stdin;
49841245-80f5-4f97-bbea-cecf53733be1	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	RTA	\N	\N	2026-02-18 18:32:45.687	\N
40d98931-21cd-43f3-bb61-d4e72133c5ff	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	Stroke	\N	\N	2026-02-19 09:26:16.171	\N
7646cef6-019f-40ae-a94b-6a570ac2df5e	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	berry aneurysm rupture	\N	\N	2026-02-24 16:50:58.92	\N
2256c097-a665-4106-b7bc-efde04fe95d3	4f8820ab-0ca8-4844-9f44-51a795c334ae	ICU-01	Sepsis	\N	\N	2026-02-16 11:00:51.774	2026-02-26 09:27:14.286
93b3fd4d-1dae-41eb-b314-1f4b13bb7235	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	DKA with Complication	\N	\N	2026-02-18 19:00:07.88	2026-02-26 09:27:26.147
9b4fd1d6-c5a0-49c6-a685-51b3fb72ce64	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	\N	sjs	a34fc237-a253-4acd-8e8d-de5f48797666	912423fe-c441-42bd-b338-2c809c22e908	2026-03-09 22:12:07.939	2026-03-09 22:19:05.734
0a307402-ccc1-4574-aefe-83a30a981200	0ebf79aa-cc02-474f-9680-a5833144423f	\N	Test Diagnosis	\N	\N	2026-03-03 20:14:03.783	2026-03-09 22:19:32.797
7267c064-751f-4525-9166-9b5deacc6e81	9521ed83-9eb9-468a-ab99-99d4378cc7f2	\N	stroke	a1e9ac3e-4787-46f6-86b9-7478ef2e989b	ab7d09ec-f5af-443d-9052-454336241359	2026-03-09 21:58:43.46	2026-03-09 22:19:43.641
6c3cc428-0d68-4bc8-be90-0512d499b251	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	RTA	a89fad06-e2da-49e7-8298-80b9abca60ce	16726f74-dc70-4516-8395-8fe12a694b97	2026-02-26 09:28:52.897	\N
6e406f24-537f-425a-9db3-67b12f45a7e5	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	Shock	04e71b9f-4dd1-4721-ad39-31a482c5e44c	5822e280-8087-40c7-8390-a8bda78a705b	2026-03-11 12:21:28.467	\N
eff3d5d5-7075-475b-b2a1-e242deebfa3f	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	ICH	447e9e5b-4a4a-4912-9cc8-c1693efb89a8	ab7d09ec-f5af-443d-9052-454336241359	2026-02-26 08:54:42.948	2026-03-11 20:55:50.554
ad5c7be1-969d-4d28-9f27-ebe40dae0bc5	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	ICH	527a9644-1722-4017-898d-43f8640921a8	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:43:32.706	2026-03-11 21:54:04.659
60126ea2-4b5c-4190-8d9f-5f7b6edd32c0	c545e12f-9e2d-485c-90f4-43a2b7203391	\N	Pneumoniae 	a621a5b8-2b98-4a40-9778-2b7a8a7eecb6	1839f81b-d683-453f-9a2c-9ec4f83550ce	2026-03-12 08:37:02.315	\N
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, action, details, "userId", "timestamp") FROM stdin;
\.


--
-- Data for Name: ClinicalNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClinicalNote" (id, "patientId", "authorId", type, title, content, data, "createdAt", "updatedAt") FROM stdin;
b88aa163-1d0f-48d4-8c62-532b5d66d79f	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 1	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-17 22:00:51.913	2026-02-19 11:00:51.989
bac07690-c855-4f6d-adec-cf5eda39702b	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 2	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-18 10:00:51.913	2026-02-19 11:00:51.989
9fc2fb4a-6d51-4edf-b607-c0b9b50f8be1	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 3	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-18 22:00:51.913	2026-02-19 11:00:51.989
030b23bb-7822-4f95-839e-eebac1e40133	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 4	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-19 10:00:51.913	2026-02-19 11:00:51.989
551f6606-a876-4d8a-9c0e-ec4c47dc0d02	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	PROGRESS	adily	Subjective:drug \n\nObjective:..\n\nAssessment:..\n\nPlan: Patient was given tow tablet of Loperamide 2mg	{}	2026-03-09 11:29:12.534	2026-03-09 11:29:12.534
44e1c106-5e22-4f4a-9370-b7eeed48fd42	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	ADMISSION	Admission note	Chief Complaint:\n\nHPI:\n\nPMH:\n\nPlan:	{}	2026-03-11 12:45:28.519	2026-03-11 12:45:28.519
8429c73d-ecf6-4ded-8a8d-1aa19fdcb832	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	ADMISSION	admission note	Chief Complaint:\n\nHPI:\n\nPMH:\n\nPlan:	{}	2026-03-11 13:00:09.811	2026-03-11 13:00:09.811
\.


--
-- Data for Name: ClinicalOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClinicalOrder" (id, "patientId", "authorId", "approverId", type, status, priority, title, details, notes, "createdAt", "updatedAt", "reminderAt", "reminderSent") FROM stdin;
2d8aa5ef-6bc1-44c7-9b14-06f0cd0552a8	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-18 18:32:45.699	2026-02-24 15:30:05.803	\N	f
d1a6fa05-5d6c-45f4-969c-4c007495b864	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	CONSULT	COMPLETED	ROUTINE	Consultation to dr hasan aldabagh about ptt	{"info": ""}		2026-02-24 19:02:47.63	2026-02-25 23:33:26.319	\N	f
7eee75ea-b7b3-4709-8b57-35651ad57d90	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-18 19:00:07.893	2026-02-26 11:23:00.793	\N	f
7b1f4fc8-1e42-4d16-b5a8-3485f20e6fff	b97ca87a-eebf-436f-ab50-9477234dfaad	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-24 16:50:58.944	2026-02-26 11:23:02.367	\N	f
e2c418d7-98ec-47b2-8ee8-ca61fc1a4325	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-nurse-id	mock-nurse-id	PROCEDURE	COMPLETED	ROUTINE	Tracheostomy	{"interventionType": "Tracheostomy"}	stop plavix and clexan	2026-02-24 15:29:43.461	2026-02-26 11:23:03.757	\N	f
98bca48a-c57e-4332-b7ed-e87dc0f14c9f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-nurse-id	mock-nurse-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-19 09:26:16.185	2026-02-26 11:23:04.992	\N	f
6febd2a2-b246-4977-8561-3f6fc8c008ba	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-24 17:43:32.716	2026-02-26 11:23:07.051	\N	f
e0071fc7-724a-4af3-a6d7-7509498c6fbe	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-26 08:54:42.963	2026-02-26 11:23:08.3	\N	f
58c3b852-4704-47ac-9cae-63edaf7c8ee0	949d4d05-0ff6-4f4d-824f-33b2b25fa073	mock-nurse-id	mock-nurse-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-26 09:28:52.906	2026-02-26 11:23:14.52	\N	f
80e44bba-9ef5-4659-94d2-b4b263b8cc82	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	CONSULT	COMPLETED	ROUTINE	Consult Cardithoracic surgeon	{"info": ""}		2026-02-26 11:26:33.589	2026-02-26 15:45:04.415	\N	f
8304a491-6a3b-495f-b557-91adba934bf8	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	Arterial Line	{"interventionType": "Arterial Line"}		2026-03-03 20:02:14.703	2026-03-03 20:02:30.042	\N	f
75b25ce2-6ebf-44c3-ac4f-13d817805fcd	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	Test Reminder	{}	\N	2026-03-03 20:21:56.479	2026-03-06 21:23:25.103	\N	f
2f2a4d86-4b93-49a8-a961-1f7cbb60fef5	0ebf79aa-cc02-474f-9680-a5833144423f	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-03-03 20:14:03.825	2026-03-06 21:23:25.829	\N	f
e130e86e-ba93-421d-b335-9b014e1dd288	68baae90-91be-4b76-9d3b-7e5e423a0523	2806f3c1-e62a-468a-be59-838db585a8f9	2806f3c1-e62a-468a-be59-838db585a8f9	NURSING	COMPLETED	ROUTINE	Abdomen	{"info": ""}		2026-03-07 20:40:01.399	2026-03-07 20:40:39.329	\N	f
7b6c7911-778d-4082-9a65-0222185dfd4f	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	LAB	COMPLETED	ROUTINE	oo	{"info": ""}		2026-03-08 09:38:39.801	2026-03-08 09:39:14.516	\N	f
4ebbb193-bb00-47d6-8ead-9692fadb2621	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	ETT	{"timeDone": "2026-03-08T22:41:00.000Z", "interventionType": "ETT", "notificationText": "test"}		2026-03-08 22:41:52.054	2026-03-08 22:43:30.285	2026-03-08 22:43:00	f
28bf25f0-500b-4d42-a6c1-9ffc04b4973f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	ETT	{"timeDone": "2026-03-04T20:21:00.000Z", "interventionType": "ETT", "notificationText": "change tube"}		2026-03-08 20:21:47.888	2026-03-08 20:31:34.304	2026-03-08 20:22:00	t
9010d280-3aea-49a7-8eac-c6e0d3af826c	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	Tracheostomy	{"timeDone": "2026-03-06T20:22:00.000Z", "interventionType": "Tracheostomy", "notificationText": "change tracheostomy"}	size 7.5	2026-03-08 20:23:28.967	2026-03-08 20:31:35.793	2026-03-08 20:25:00	t
70e893f9-8cd4-4117-9d99-7f4eed788820	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	ETT	{"timeDone": "2026-03-08T21:58:00.000Z", "interventionType": "ETT", "notificationText": "test intervention"}		2026-03-08 21:58:58.454	2026-03-08 21:59:23.869	2026-03-09 18:58:00	f
68c907ac-fb5a-4017-b945-9ce866b892eb	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-senior-id	mock-senior-id	PROCEDURE	COMPLETED	ROUTINE	ETT	{"timeDone": "2026-03-08T21:59:00.000Z", "interventionType": "ETT", "notificationText": "test"}		2026-03-08 22:00:26.681	2026-03-08 22:00:43.093	2026-03-08 22:03:00	f
5302a938-e5dc-473c-b1ec-ab22aff2f970	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	IMAGING	COMPLETED	ROUTINE	CT Brain	{"info": ""}		2026-03-09 10:17:28.201	2026-03-09 10:17:45.949	\N	f
ed4c0d04-b83c-437c-8160-69c88b8c787c	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	CONSULT	COMPLETED	URGENT	call nawaf	{"info": ""}		2026-03-09 13:07:01.688	2026-03-09 13:07:33.288	\N	f
27b356d8-ad5b-4e07-aa83-4d11f05602e4	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	MEDICATION	COMPLETED	ROUTINE	test	{"info": ""}		2026-03-09 18:39:45.019	2026-03-09 18:39:53.984	\N	f
6b9289c5-ea24-4f72-b8a8-9248a2a4ba24	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2806f3c1-e62a-468a-be59-838db585a8f9	2806f3c1-e62a-468a-be59-838db585a8f9	CONSULT	COMPLETED	ROUTINE	Dr.Nawaf	{"info": ""}		2026-03-09 21:04:05.035	2026-03-09 21:04:15.093	\N	f
18d1edd6-712e-47dd-b365-c9f28de4fdeb	9521ed83-9eb9-468a-ab99-99d4378cc7f2	mock-senior-id	mock-senior-id	MEDICATION	COMPLETED	ROUTINE	Omeprazole	{"dose": "40mg", "route": "IV", "frequency": "Once daily"}	\N	2026-03-09 21:58:43.484	2026-03-09 21:59:03.82	\N	f
e9587b28-d29c-4e3e-9b76-070cf5f31756	9521ed83-9eb9-468a-ab99-99d4378cc7f2	mock-senior-id	mock-senior-id	MEDICATION	COMPLETED	ROUTINE	Clexane	{"dose": "40mg", "route": "SC", "frequency": "Once daily"}	\N	2026-03-09 21:58:43.48	2026-03-09 21:59:05.208	\N	f
749adcc6-e302-42ab-bd74-8cfbea07a790	9521ed83-9eb9-468a-ab99-99d4378cc7f2	mock-senior-id	mock-senior-id	PROTOCOL	COMPLETED	ROUTINE	Charge the patient for ICU Stay	{"instruction": "Ensure ICU daily charges are applied"}	\N	2026-03-09 21:58:43.476	2026-03-09 21:59:06.681	\N	f
66174da0-95bc-463d-b5a1-91bb93602655	9521ed83-9eb9-468a-ab99-99d4378cc7f2	mock-senior-id	mock-senior-id	DIET	COMPLETED	ROUTINE	Start Feeding	{"instruction": "Begin enteral feeding as per protocol"}	\N	2026-03-09 21:58:43.489	2026-03-09 21:59:16.219	2026-03-10 21:58:43.488	f
2e52ec28-e03f-4ec7-b90a-b5740044b96c	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	change dressing	{"info": "", "repetition": "DAILY"}		2026-03-09 21:29:57.39	2026-03-09 21:59:17.119	\N	f
e0894585-3091-4102-b02f-eeaa55ce7f93	9521ed83-9eb9-468a-ab99-99d4378cc7f2	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-03-09 21:58:43.47	2026-03-09 21:59:07.603	\N	f
8d018ec9-ba20-41ee-8f98-1e4712767dab	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	mock-senior-id	mock-senior-id	DIET	COMPLETED	ROUTINE	Start Feeding	{"instruction": "Begin enteral feeding as per protocol"}	\N	2026-03-09 22:12:07.973	2026-03-09 22:19:15.899	2026-03-10 22:12:07.971	f
1a9c1a7f-dc4e-4822-833d-f13c41d592c9	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	mock-senior-id	mock-senior-id	MEDICATION	COMPLETED	ROUTINE	Omeprazole	{"dose": "40mg", "route": "IV", "frequency": "Once daily"}	\N	2026-03-09 22:12:07.969	2026-03-09 22:19:16.939	\N	f
48b64bf6-a41c-4821-890f-3b844e4ed3b9	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	mock-senior-id	mock-senior-id	MEDICATION	COMPLETED	ROUTINE	Clexane	{"dose": "40mg", "route": "SC", "frequency": "Once daily"}	\N	2026-03-09 22:12:07.964	2026-03-09 22:19:18.063	\N	f
98cedfb5-d667-495d-9682-6edfe16bfd6a	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	mock-senior-id	mock-senior-id	PROTOCOL	COMPLETED	ROUTINE	Charge the patient for ICU Stay	{"instruction": "Ensure ICU daily charges are applied"}	\N	2026-03-09 22:12:07.959	2026-03-09 22:19:19.051	\N	f
312a5001-e691-458e-a08b-bed79839e355	6ff9b393-f837-498d-80f4-5ec64bfaa1e1	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-03-09 22:12:07.953	2026-03-09 22:19:22.178	\N	f
95425a2d-cb0f-401a-9ad6-2b763e978a63	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	mock-senior-id	IMAGING	COMPLETED	ROUTINE	Ct brain	{"info": ""}		2026-03-10 20:01:03.339	2026-03-10 20:01:16.029	\N	f
263204c2-041f-4c37-ba19-c690bdf5f183	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	mock-senior-id	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-03-11 12:21:28.52	2026-03-11 12:21:28.52	\N	f
e66271f3-c2fe-4947-80aa-8c8729503de2	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	mock-senior-id	PROTOCOL	APPROVED	ROUTINE	Charge the patient for ICU Stay	{"instruction": "Ensure ICU daily charges are applied"}	\N	2026-03-11 12:21:28.548	2026-03-11 12:21:28.548	\N	f
bfb4fa0c-b574-4f16-94b5-f5390107ca7a	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	mock-senior-id	MEDICATION	APPROVED	ROUTINE	Clexane	{"dose": "40mg", "route": "SC", "frequency": "Once daily"}	\N	2026-03-11 12:21:28.556	2026-03-11 12:21:28.556	\N	f
2ced6f8d-08d1-463a-a163-33a2e285e8d4	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	mock-senior-id	MEDICATION	APPROVED	ROUTINE	Omeprazole	{"dose": "40mg", "route": "IV", "frequency": "Once daily"}	\N	2026-03-11 12:21:28.569	2026-03-11 12:21:28.569	\N	f
585175a4-2d63-49a0-82a4-c91bcee0ed69	a5c4839d-c071-4c89-a204-b390ad8e8af4	mock-senior-id	mock-senior-id	DIET	APPROVED	ROUTINE	Start Feeding	{"instruction": "Begin enteral feeding as per protocol"}	\N	2026-03-11 12:21:28.581	2026-03-11 12:21:28.581	2026-03-12 12:21:28.575	f
5cd92573-a9f5-493f-9b21-7fef1b0ee1d2	c545e12f-9e2d-485c-90f4-43a2b7203391	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-03-12 08:37:02.336	2026-03-12 08:37:02.336	\N	f
751a21ee-8529-4749-99d2-7fe224dd0030	c545e12f-9e2d-485c-90f4-43a2b7203391	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	PROTOCOL	APPROVED	ROUTINE	Charge the patient for ICU Stay	{"instruction": "Ensure ICU daily charges are applied"}	\N	2026-03-12 08:37:02.349	2026-03-12 08:37:02.349	\N	f
1df3e8bc-c13d-4349-a11b-11a91c2e737a	c545e12f-9e2d-485c-90f4-43a2b7203391	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	MEDICATION	APPROVED	ROUTINE	Clexane	{"dose": "40mg", "route": "SC", "frequency": "Once daily"}	\N	2026-03-12 08:37:02.355	2026-03-12 08:37:02.355	\N	f
fa5ea637-9576-4046-bedf-ad25c89a56a3	c545e12f-9e2d-485c-90f4-43a2b7203391	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	MEDICATION	APPROVED	ROUTINE	Omeprazole	{"dose": "40mg", "route": "IV", "frequency": "Once daily"}	\N	2026-03-12 08:37:02.362	2026-03-12 08:37:02.362	\N	f
5e4edc42-8b02-45cc-8485-8dea9fd75772	c545e12f-9e2d-485c-90f4-43a2b7203391	a2497fb8-1acf-44d4-a3bf-9289be25efe9	a2497fb8-1acf-44d4-a3bf-9289be25efe9	DIET	APPROVED	ROUTINE	Start Feeding	{"instruction": "Begin enteral feeding as per protocol"}	\N	2026-03-12 08:37:02.368	2026-03-12 08:37:02.368	2026-03-13 08:37:02.366	f
\.


--
-- Data for Name: Consultation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Consultation" (id, "patientId", "authorId", "doctorName", specialty, "imageUrl", notes, "timestamp", "updatedAt", "orderId") FROM stdin;
9aa39b0c-4985-47d9-bb72-7a97a8c82b48	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2806f3c1-e62a-468a-be59-838db585a8f9	Dr,Nawaf	Nephrology	/uploads/files-1773090399769-111244234.jpeg	For CRRT	2026-03-09 21:06:55.035	2026-03-09 21:06:55.037	\N
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Doctor" (id, name, "specialtyId", "createdAt") FROM stdin;
b852906e-3389-4e97-b9cf-8e8e6e4cc1e2	عمر غزال	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:23:09.265
527a9644-1722-4017-898d-43f8640921a8	Omar Ghazal	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:30:08.16
ad69b117-dc1f-4e39-b91e-51de1996e2d0	Omar Ghazal	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:31:39.806
447e9e5b-4a4a-4912-9cc8-c1693efb89a8	Aws Nidhal	ab7d09ec-f5af-443d-9052-454336241359	2026-02-26 08:54:42.712
a89fad06-e2da-49e7-8298-80b9abca60ce	Zakareay Rabi	16726f74-dc70-4516-8395-8fe12a694b97	2026-02-26 09:28:52.647
a1e9ac3e-4787-46f6-86b9-7478ef2e989b	ali sameer	ab7d09ec-f5af-443d-9052-454336241359	2026-03-09 21:58:43.267
a34fc237-a253-4acd-8e8d-de5f48797666	ali sameer	912423fe-c441-42bd-b338-2c809c22e908	2026-03-09 22:12:07.474
04e71b9f-4dd1-4721-ad39-31a482c5e44c	Atyaf	5822e280-8087-40c7-8390-a8bda78a705b	2026-03-11 12:21:28.146
a621a5b8-2b98-4a40-9778-2b7a8a7eecb6	waad allah albadrani	1839f81b-d683-453f-9a2c-9ec4f83550ce	2026-03-12 08:37:02.08
\.


--
-- Data for Name: DrugCatalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DrugCatalog" (id, name, "defaultDose", "defaultRoute", "createdAt") FROM stdin;
c4c30be7-0de1-4d0c-8ca3-bd7f19ae6461	B-Core	2.5	IV	2026-02-24 17:56:00.96
c5a082ff-d670-4f29-9ec0-8dd7c7663111	sevelamer	800	PO	2026-02-24 17:56:54.479
93e1fcf6-4247-4a43-ab99-e9ba2851ca49	alpha one 	20	PO	2026-02-24 18:22:27.501
9184cd46-a92e-4e5c-badd-6af1f62d0fc5	keppra vial	500	IV	2026-02-24 18:22:46.402
66a2ac68-3fe6-4e1b-ae4a-1fba7ef3c502	ca carbonate	500	IV	2026-02-24 18:54:11.621
befc9219-f138-48fe-98a5-52a5d8a816f9	tegretol tab 	200	IV	2026-02-24 18:54:30.026
e9846fa8-85c3-4ca7-bfa4-7b6943c6fbef	GS + NS	80	IV	2026-02-24 18:55:15.182
bf4514a6-470b-41ea-80b6-a9f4985a7cdc	Paracetamol	1 g	IV	2026-02-24 18:55:32.934
0c06da58-0838-4161-a5e9-e1bf7fa5fe84	Pantoprazole	40 mg	IV	2026-02-24 18:55:46.43
fc1c9de4-2c89-4c12-a59e-c15fe03b125e	Albumin 20%	20%	IV	2026-02-24 18:56:01.645
9beb63d9-186d-4aa1-b640-1a645c50d4c8	L - Carintine 	3cc	IV	2026-02-24 18:56:18.611
85c2535d-8a40-488a-9d46-e4848cd522f4	Caspofungin	50	IV	2026-02-24 18:56:37.612
e2cebe8f-8e84-453c-8d4d-3aa86a49fbac	Vancomycin	1 g	IV	2026-02-24 18:56:55.775
37f36a5a-4b48-4cc6-b0d8-15216a773c8c	Ciprofloxacine	200	IV	2026-02-24 18:57:37.33
0eaa7a37-a3d9-4da9-b046-55cbfde6940b	Ipratropium Bromide 	neb	NEB	2026-02-24 18:58:02.728
3f703752-d358-4849-b489-bd0de378064d	NACl 3%	Neb	NEB	2026-02-24 18:58:20.659
b637f3b5-9487-44fd-9053-06abf5ac2584	Eye drop	lub	NEB	2026-02-24 18:58:52.282
02906dc6-a0f3-4bf7-96b1-791dc255639c	Solvodin	amp	IV	2026-02-24 18:59:12.328
ad7cd963-e80b-4212-94dd-c2ea42083849	fusidine 	oint	IV	2026-02-24 18:59:40.133
e12a0a47-9a25-4f7c-8adf-e931d43a605c	Assist 	Neb	NEB	2026-02-24 19:00:12.128
27fc9a1d-fab1-4716-83fd-557f961f1e7b	Hydrocortisone	100 mg	IV	2026-02-24 19:00:27.802
9a6c8008-59e3-45bb-8f02-b2f396fbecde	Meropenem	1 g	IV	2026-02-24 19:00:40.13
f3fd9c85-f345-4ded-9e0f-5cae516fa70f	lasix 	10mg/hr	IV	2026-02-24 19:01:15.018
788895c4-023b-440c-9a9a-83adf7d2beb6	Norepinephrine	0.05 mcg/kg/min	IV	2026-03-08 22:28:29.119
a4f14165-96ad-45e8-8142-48e5ba88b198	Propofol	10 mg/ml	IV	2026-03-09 12:28:03.311
dbb48c94-028b-4159-9992-6794128847de	Adrenaline	1 mg	IV	2026-03-09 19:00:54.373
e46afa56-5d17-411f-8c8e-4f22b11360e2	dobutamine	5	IV	2026-03-09 19:01:10.954
39f42520-fed2-4f00-925b-96479c3e85d3	GS	80	IV	2026-03-09 19:05:06.744
7726559e-f051-4063-9049-afb11124b624	NS	40	IV	2026-03-09 19:05:29.195
be32d9e4-16d6-4540-a6f6-12b434f1e2e6	Lopremide	2 tab	PO	2026-03-09 20:47:08.757
\.


--
-- Data for Name: Governorate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Governorate" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IntakeOutput; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IntakeOutput" (id, "patientId", "userId", "shiftId", type, category, amount, notes, "timestamp", "pendingValue", status) FROM stdin;
20924178-ed99-4175-afb6-a98fcdd4b4f4	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 11:00:51.913	\N	APPROVED
91aee84d-bf64-42ea-903d-075c5787eb8d	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	400	\N	2026-02-17 11:00:51.913	\N	APPROVED
74b2f12f-c900-47bb-a25d-c292a186bb9e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 15:00:51.913	\N	APPROVED
f6b607aa-3ab0-4d99-92cf-a04332da34b0	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	356	\N	2026-02-17 15:00:51.913	\N	APPROVED
e4ecd213-8161-486a-8eaf-669e1d9de308	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 19:00:51.913	\N	APPROVED
84bd9a96-de5e-4526-835a-2debc6ce56c9	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	423	\N	2026-02-17 19:00:51.913	\N	APPROVED
f1809ee1-db94-42f8-a8cd-d1a4d040945e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 23:00:51.913	\N	APPROVED
236d35b1-2354-42a4-be17-83066cf90772	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	315	\N	2026-02-17 23:00:51.913	\N	APPROVED
d28b8b66-f75e-4923-a8ca-d190f1b1e79d	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 03:00:51.913	\N	APPROVED
703f4784-50b1-4575-90eb-514755a46dbe	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	421	\N	2026-02-18 03:00:51.913	\N	APPROVED
49c2f637-8c63-4652-9de0-845b64f83428	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 07:00:51.913	\N	APPROVED
fd55f675-29a9-4860-8057-13da5abd8f9e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	210	\N	2026-02-18 07:00:51.913	\N	APPROVED
57b98a6a-f38c-46be-83e6-797553eafc10	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 11:00:51.913	\N	APPROVED
4d463028-7a09-4c2d-8c70-530651d0711e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	223	\N	2026-02-18 11:00:51.913	\N	APPROVED
75e4145d-bd16-4e10-a746-f4e45f03f10c	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 15:00:51.913	\N	APPROVED
9316cbe4-5c1a-4bcd-8bf3-d446c0aea593	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	204	\N	2026-02-18 15:00:51.913	\N	APPROVED
f9fef10a-1394-44d8-94b0-bc1b9781600e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 19:00:51.913	\N	APPROVED
2f769459-184b-4ba8-a23a-37f4748a6c88	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	223	\N	2026-02-18 19:00:51.913	\N	APPROVED
5cf373d3-53eb-4e51-85f3-e7408eb2f578	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 23:00:51.913	\N	APPROVED
8465de38-f8ac-450a-9869-0672003bf59c	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	210	\N	2026-02-18 23:00:51.913	\N	APPROVED
ed81ec93-9e34-472e-8c09-9509c8a15d91	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-19 03:00:51.913	\N	APPROVED
713d10c9-de47-486f-bb57-badbf9508b6f	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	192	\N	2026-02-19 03:00:51.913	\N	APPROVED
40e754f8-b1ba-46d6-9405-ba14da0e934b	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-19 07:00:51.913	\N	APPROVED
9239d355-393f-477d-aa31-2d5969046548	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	394	\N	2026-02-19 07:00:51.913	\N	APPROVED
71fd3e2a-a494-46e8-a3d3-ddcd5ab70baf	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	52		2026-02-20 22:24:40.501	\N	APPROVED
70de431b-08d2-4b9b-b2fb-fc191e1c66e7	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	117	Drug dilution	2026-02-20 22:24:40.501	\N	APPROVED
4f6d43e0-95d0-46a5-88d6-2ec056f2e360	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	53		2026-02-20 23:24:40.501	\N	APPROVED
7ed010eb-298b-4fab-9da9-35c6981dd9ab	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	73		2026-02-21 00:24:40.501	\N	APPROVED
16590249-978c-4472-b439-bd0c2f95b139	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	49		2026-02-21 01:24:40.501	\N	APPROVED
b733794b-18ac-4144-b489-316b62e8be5d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	55		2026-02-21 02:24:40.501	\N	APPROVED
2f4c0fbe-511e-4090-b248-b5822a5779e0	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	49		2026-02-21 03:24:40.501	\N	APPROVED
2d4464b5-b288-4cbc-984f-a720983b6a4c	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	32		2026-02-21 04:24:40.501	\N	APPROVED
08fea1aa-e3f7-4167-9d70-33833181d179	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	38		2026-02-21 05:24:40.501	\N	APPROVED
072a03c6-0078-45f9-b670-0dadce92d9f2	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	54		2026-02-21 06:24:40.501	\N	APPROVED
a41ae43d-108c-4ead-9141-540f9afc0743	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	118	Drug dilution	2026-02-21 06:24:40.501	\N	APPROVED
842016c9-237f-4622-bad1-bd0de5df4a21	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	25		2026-02-21 07:24:40.501	\N	APPROVED
7df3654e-69ef-4737-a2a2-c0d10bc33388	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	66		2026-02-21 08:24:40.501	\N	APPROVED
dc48a6f6-a231-4481-ad1e-dd98eb952d57	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	92		2026-02-21 09:24:40.501	\N	APPROVED
877a0b4e-2f12-4a00-9a1a-30d7dd117ddb	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	64		2026-02-21 10:24:40.501	\N	APPROVED
834c2e58-4140-434b-b2ac-6238c51a0988	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	55		2026-02-21 11:24:40.501	\N	APPROVED
c868c7f0-1962-46e0-96e7-dbbf77c75972	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	66		2026-02-21 12:24:40.501	\N	APPROVED
9ac504db-ee63-4d90-b24e-94aeb3f19954	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	46		2026-02-21 13:24:40.501	\N	APPROVED
332b00f9-8d64-493d-877d-345a90796b6d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	83		2026-02-21 14:24:40.501	\N	APPROVED
cb6c3a58-62fa-4f00-91ac-d9284afd2119	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	146	Drug dilution	2026-02-21 14:24:40.501	\N	APPROVED
cc4965df-95b2-4451-aa1b-fdb80de6dbec	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	90		2026-02-21 15:24:40.501	\N	APPROVED
591f90ef-6878-45ea-8e46-39133cc5c9fe	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	49		2026-02-21 16:24:40.501	\N	APPROVED
d4832fab-2a37-441f-8a5c-70dedff9ad58	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	74		2026-02-21 17:24:40.501	\N	APPROVED
81650a4a-9f1a-46b5-985b-c81ab94f67e8	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	78		2026-02-21 18:24:40.501	\N	APPROVED
72a16c37-f233-4bab-b41c-e5e73b62d89f	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	44		2026-02-21 19:24:40.501	\N	APPROVED
45d8aa3a-1ed6-4f59-8fa2-f095e60dda88	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	30		2026-02-21 20:24:40.501	\N	APPROVED
aecc4f40-e495-4c92-b5fc-64a8c8aec11b	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	84		2026-02-21 21:24:40.501	\N	APPROVED
2a9817ec-f5dc-43dc-9d5d-7cc7ab72501c	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	72		2026-02-21 22:24:40.501	\N	APPROVED
5a09727e-7a9d-4fe3-ab8e-a841c40a3b9d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	145	Drug dilution	2026-02-21 22:24:40.501	\N	APPROVED
bd7547a2-cd3f-4633-85c1-4bdbafa87070	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	93		2026-02-21 23:24:40.501	\N	APPROVED
3a21d84b-fd62-4088-86e5-5d0945a6bdbb	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	67		2026-02-22 00:24:40.501	\N	APPROVED
b4bf0375-0b36-4f68-b6b4-de29a46074aa	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	84		2026-02-22 01:24:40.501	\N	APPROVED
f096856f-b22f-4079-8796-49cc030dfce4	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	67		2026-02-22 02:24:40.501	\N	APPROVED
99f632da-642f-4e7f-9307-f30db2834487	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	90		2026-02-22 03:24:40.501	\N	APPROVED
0ae13cd5-bb62-49f4-b8e6-44896e2ab286	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	67		2026-02-22 04:24:40.501	\N	APPROVED
bcb590d7-6d4a-4680-a49f-7a489dbe9a56	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	52		2026-02-22 05:24:40.501	\N	APPROVED
43d68320-4366-4780-921f-ab13c7fe9ab6	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	25		2026-02-22 06:24:40.501	\N	APPROVED
4ca72c45-2a94-4c74-a3a5-77d8b9723a73	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	119	Drug dilution	2026-02-22 06:24:40.501	\N	APPROVED
220d5554-bbd1-4135-85f0-99f8c192fc7a	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	72		2026-02-22 07:24:40.501	\N	APPROVED
34c04abd-8291-4001-b05b-f5f41a47fe86	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	54		2026-02-22 08:24:40.501	\N	APPROVED
fe9d2cc6-bb63-4fd6-9c20-6132ed299237	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	89		2026-02-22 09:24:40.501	\N	APPROVED
e0a01029-17c0-43d4-8af9-3ee3e32d9dff	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	91		2026-02-22 10:24:40.501	\N	APPROVED
67cc13cd-34f9-4cb2-8da9-6bfc352c6744	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	36		2026-02-22 11:24:40.501	\N	APPROVED
c49de4ef-bed4-4d9c-8793-7c5867efaf2e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	60		2026-02-22 12:24:40.501	\N	APPROVED
4bbc5cee-8cf5-48da-959c-6473f99b1eda	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	78		2026-02-22 13:24:40.501	\N	APPROVED
9aa258ee-10d2-464f-9d8e-1928fc91d27e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	97		2026-02-22 14:24:40.501	\N	APPROVED
76deb2ac-5b92-4046-bb73-9e9f2ae93842	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	123	Drug dilution	2026-02-22 14:24:40.501	\N	APPROVED
d74c4228-831d-4278-92d9-a055917be96e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	72		2026-02-22 15:24:40.501	\N	APPROVED
4a16acdc-c1a8-4e8c-a4dc-528106b4daa4	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	91		2026-02-22 16:24:40.501	\N	APPROVED
e8869578-ef1b-4d98-8aba-8391038c1990	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	96		2026-02-22 17:24:40.501	\N	APPROVED
0df91221-23db-4e2d-8591-c70dafc45df8	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	33		2026-02-22 18:24:40.501	\N	APPROVED
c603cda0-0fc8-4f6a-934d-f1610aacb612	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	93		2026-02-22 19:24:40.501	\N	APPROVED
cfb0ceb1-f842-4333-8268-5af30d00fae6	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	87		2026-02-22 20:24:40.501	\N	APPROVED
0f160224-1068-493b-a037-768dbb2d1968	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	89		2026-02-22 21:24:40.501	\N	APPROVED
14f25366-a585-4ff6-be0f-d299458a5e43	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	87		2026-02-22 22:24:40.501	\N	APPROVED
bf64bb87-a196-4df9-b784-84e04ddaa485	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	142	Drug dilution	2026-02-22 22:24:40.501	\N	APPROVED
c67715e0-156f-4ef7-a3ed-a3133bf4dc95	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	77		2026-02-22 23:24:40.501	\N	APPROVED
1fdc4554-73af-4396-8f2c-1904779a75fc	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	91		2026-02-23 00:24:40.501	\N	APPROVED
24337e5b-3b34-4449-a566-1bf987778db4	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	75		2026-02-23 01:24:40.501	\N	APPROVED
1763c2de-01c6-4928-8e7b-f6a044f2c97b	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	48		2026-02-23 02:24:40.501	\N	APPROVED
316717ef-fee6-4618-81e3-64cd2ed450e5	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	88		2026-02-23 03:24:40.501	\N	APPROVED
db5fa821-a8cd-43e6-a695-d3aff79e43aa	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	72		2026-02-23 04:24:40.501	\N	APPROVED
0f134df0-e659-435e-ba76-7e5d3d6336e5	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	92		2026-02-23 05:24:40.501	\N	APPROVED
482c7080-a511-426f-acd1-9f8d231fe405	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	83		2026-02-23 06:24:40.501	\N	APPROVED
0285fab0-85ce-4bf4-a5a9-e6584d88e43e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	113	Drug dilution	2026-02-23 06:24:40.501	\N	APPROVED
4565c8be-742f-41c5-b10c-209cebed8c37	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	73		2026-02-23 07:24:40.501	\N	APPROVED
04d6288c-02b3-4d40-a45d-4a3ea6c6acc9	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	76		2026-02-23 08:24:40.501	\N	APPROVED
fb9bd656-5783-4ed5-9a3c-70f152898ed6	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	96		2026-02-23 09:24:40.501	\N	APPROVED
f44d194f-4e58-4dbc-8473-cc95296b17f2	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	51		2026-02-23 10:24:40.501	\N	APPROVED
d4deecfc-c5bd-4267-99a7-22e9daec9cf0	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	74		2026-02-23 11:24:40.501	\N	APPROVED
988e1e0f-616a-426b-9c1b-3c25784e1f59	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	38		2026-02-23 12:24:40.501	\N	APPROVED
1726160b-8ebc-460c-8ff2-4170c80b3a82	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	83		2026-02-23 13:24:40.501	\N	APPROVED
10790c63-0017-4121-bd83-7fc5d6450c24	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	39		2026-02-23 14:24:40.501	\N	APPROVED
3aa7b8f7-afb5-447e-8996-52adfe3eeab5	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	113	Drug dilution	2026-02-23 14:24:40.501	\N	APPROVED
32e17b33-f3e3-46b7-b24f-eccd2659f93f	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	35		2026-02-23 15:24:40.501	\N	APPROVED
0985c0b7-53b5-4e98-a15b-d2c3982b321a	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	51		2026-02-23 16:24:40.501	\N	APPROVED
40edf622-0fa3-4b76-86f0-717233d6c748	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	82		2026-02-23 17:24:40.501	\N	APPROVED
40facd83-83e3-4fa3-b247-6db218e9ace0	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	60		2026-02-23 18:24:40.501	\N	APPROVED
19b70c50-7321-4cc5-80d4-b8f03b087722	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	46		2026-02-23 19:24:40.501	\N	APPROVED
4cdee222-ac16-4e9c-a3fa-0501b019a96e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	92		2026-02-23 20:24:40.501	\N	APPROVED
4b90d159-8de0-4297-885e-7b9e2797005d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	82		2026-02-23 21:24:40.501	\N	APPROVED
7cab0899-445e-48e2-8821-efdb798ddd92	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	79		2026-02-23 22:24:40.501	\N	APPROVED
0fdaae4c-d2b2-498d-bd26-9abbdecc6894	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	105	Drug dilution	2026-02-23 22:24:40.501	\N	APPROVED
91502334-d433-40df-99ae-968478db7fb3	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	63		2026-02-23 23:24:40.501	\N	APPROVED
f971ac72-992d-4d5d-9412-c7f6b4cca5e7	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	85		2026-02-24 00:24:40.501	\N	APPROVED
adf2a418-e2e3-4f53-908d-28da65e02ead	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	43		2026-02-24 01:24:40.501	\N	APPROVED
4552ee4d-4409-446d-bc85-2ea1c456d8d9	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	66		2026-02-24 02:24:40.501	\N	APPROVED
61c4f596-10de-4c0c-8116-8102df70e352	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	53		2026-02-24 03:24:40.501	\N	APPROVED
12bfe17e-844f-40b1-84ee-bb39e37152db	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	99		2026-02-24 04:24:40.501	\N	APPROVED
2051ba9b-9f48-45f0-b521-9fbea9e6a89d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	36		2026-02-24 05:24:40.501	\N	APPROVED
dc07ff39-952e-477f-b9cc-0a4300de2a28	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	73		2026-02-24 06:24:40.501	\N	APPROVED
781bdeae-784c-4147-9b76-7cdf370b852a	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	114	Drug dilution	2026-02-24 06:24:40.501	\N	APPROVED
dd7a9d3b-4e99-413c-bc80-825a9bb77086	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	34		2026-02-24 07:24:40.501	\N	APPROVED
f23f292b-3ad0-4fe5-9d80-161077f4822d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	72		2026-02-24 08:24:40.501	\N	APPROVED
cee6413d-3588-4e10-944e-9782125735f6	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	40		2026-02-24 09:24:40.501	\N	APPROVED
4eac90a7-9345-45d5-a1a8-dd804cb99db3	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	31		2026-02-24 10:24:40.501	\N	APPROVED
8087bb67-0f61-4897-840e-82b6587b757c	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	74		2026-02-24 11:24:40.501	\N	APPROVED
37fe0419-19db-418c-841b-bda3facf0506	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	45		2026-02-24 12:24:40.501	\N	APPROVED
64c4151e-7445-4bd1-b799-908d2b0cd69a	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	84		2026-02-24 13:24:40.501	\N	APPROVED
c3a1e61f-9e5b-4a00-a3c4-472b84628f3b	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	96		2026-02-24 14:24:40.501	\N	APPROVED
5ab0ed2c-cadd-4c81-ba3a-24f50815bb5e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	107	Drug dilution	2026-02-24 14:24:40.501	\N	APPROVED
d7684f6f-6537-41ba-ba4c-a32ada0d4a37	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	36		2026-02-24 15:24:40.501	\N	APPROVED
6f12179f-f9dd-4c3b-b68f-0c53d31596f9	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	96		2026-02-24 16:24:40.501	\N	APPROVED
269a08b9-c08a-4ba1-b1a9-0121721b5416	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	45		2026-02-24 17:24:40.501	\N	APPROVED
1a4703da-7592-452e-a1ad-20c9f8845e09	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	47		2026-02-24 18:24:40.501	\N	APPROVED
7a7fc57e-daf4-4e9c-bd96-8c6846e366db	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	61		2026-02-24 19:24:40.501	\N	APPROVED
ca16ac34-42d4-4b16-893b-e0f0df5212a0	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	84		2026-02-24 20:24:40.501	\N	APPROVED
66be8ef9-75a6-4d3c-b611-7d84c98a8ba4	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	99		2026-02-24 21:24:40.501	\N	APPROVED
2e27313a-c848-441f-8d4a-a90df52801fd	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	91		2026-02-24 22:24:40.501	\N	APPROVED
896c976d-1e79-4909-b9ab-e5d24a6d5015	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	114	Drug dilution	2026-02-24 22:24:40.501	\N	APPROVED
8b027e80-111d-46b0-8e34-6afb7aa85f16	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	33		2026-02-24 23:24:40.501	\N	APPROVED
65bc5941-1526-4f66-9584-1cc85c729f5c	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	40		2026-02-25 00:24:40.501	\N	APPROVED
3e0b40b6-37fd-4c4b-9627-3dc7fa84cf7f	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	77		2026-02-25 01:24:40.501	\N	APPROVED
cd48bb82-5841-4755-9534-539ff731e10d	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	92		2026-02-25 02:24:40.501	\N	APPROVED
d0067cd8-385b-41d1-8408-50da15fb33ee	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	95		2026-02-25 03:24:40.501	\N	APPROVED
918f8ad4-1c26-4395-9c03-f14599f6b2a7	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	35		2026-02-25 04:24:40.501	\N	APPROVED
f2cb8a1d-891d-4f00-8c01-ae6d36e24098	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	97		2026-02-25 05:24:40.501	\N	APPROVED
576a88e6-e46b-4e03-ba40-660450ed1de5	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	57		2026-02-25 06:24:40.501	\N	APPROVED
515eb5b3-7ed0-4b10-b0ea-26f14620e7fc	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	135	Drug dilution	2026-02-25 06:24:40.501	\N	APPROVED
c4b69525-4fbd-404c-b103-00d26770fb64	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	93		2026-02-25 07:24:40.501	\N	APPROVED
5f4e7af7-3acf-499f-82cd-324408ce1491	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	46		2026-02-25 08:24:40.501	\N	APPROVED
b61001eb-bc91-4cdf-a291-2005501ef870	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	70		2026-02-25 09:24:40.501	\N	APPROVED
a7e50bea-b58d-4b0b-b1c3-1594ec98e6c8	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	93		2026-02-25 10:24:40.501	\N	APPROVED
1a7112d3-3bc8-4c99-8df5-3ac0ad4b7697	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	51		2026-02-25 11:24:40.501	\N	APPROVED
610d7123-90df-4b66-8c6b-8adaff6aa101	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	76		2026-02-25 12:24:40.501	\N	APPROVED
20df24ea-96f5-4c9e-9e13-07918df4e376	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	87		2026-02-25 13:24:40.501	\N	APPROVED
60a5f349-25c6-4804-a7d6-2a8ec4024af5	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	70		2026-02-25 14:24:40.501	\N	APPROVED
2bf7235f-9c3e-4191-a96c-81964edc0683	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	147	Drug dilution	2026-02-25 14:24:40.501	\N	APPROVED
e72b6553-ad1c-448d-b182-a952eb3ea69e	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	40		2026-02-25 15:24:40.501	\N	APPROVED
5eec9b98-3fc5-4da3-a981-590a8fec755f	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	40		2026-02-25 16:24:40.501	\N	APPROVED
ca05f1c6-70f9-40ba-a430-6a4986f2a55c	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	82		2026-02-25 17:24:40.501	\N	APPROVED
ffb81edd-1ca4-4689-999e-61dc97a16b92	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	69		2026-02-25 18:24:40.501	\N	APPROVED
ee5a1aad-b863-4f90-acc1-ddf4622462b7	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	58		2026-02-25 19:24:40.501	\N	APPROVED
8da0feb2-ae99-479a-b341-5d7435ffcbe9	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	76		2026-02-25 20:24:40.501	\N	APPROVED
7af8cf35-9425-4946-a832-a8a7c7bd90e2	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	63		2026-02-25 21:24:40.501	\N	APPROVED
50facb51-66ab-450f-aed3-1c6d84101f69	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	OUTPUT	Urine	100		2026-02-25 22:24:40.501	\N	APPROVED
a35232d7-ae8d-4d3c-aabb-93bd0998b645	68baae90-91be-4b76-9d3b-7e5e423a0523	a2497fb8-1acf-44d4-a3bf-9289be25efe9	\N	INPUT	IV Fluid	150	Drug dilution	2026-02-25 22:24:40.501	\N	APPROVED
e6780fe7-26c2-49f6-aaab-dbb6ab85acd4	949d4d05-0ff6-4f4d-824f-33b2b25fa073	mock-senior-id	c946ba3c-7001-484b-b5a1-639a3138ee07	INPUT	IV Fluid	80		2026-03-08 21:18:51.727	\N	APPROVED
b1b96c7a-f6e8-4207-89b5-6dc94dad17ed	949d4d05-0ff6-4f4d-824f-33b2b25fa073	mock-senior-id	c946ba3c-7001-484b-b5a1-639a3138ee07	OUTPUT	Urine	50		2026-03-08 21:19:01.102	\N	APPROVED
54a22aff-b22e-4cd7-adcf-3d47b2544179	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	6bf87508-bdec-4f46-b67d-2152c092b38e	INPUT	IV Fluid	290		2026-03-09 10:02:13.828	\N	APPROVED
71b03495-1b84-428a-adde-9bb977e8cc99	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	6bf87508-bdec-4f46-b67d-2152c092b38e	OUTPUT	Urine	500		2026-03-09 10:02:24.201	\N	APPROVED
d87c756c-df99-446e-9a04-9318c9240207	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	50		2026-03-09 10:20:17.1	\N	APPROVED
72c78615-a7a5-40ed-af4b-97e4bfcdb82b	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	400		2026-03-09 10:49:03.87	\N	APPROVED
93833d2b-d186-4d01-944b-c6727c332957	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	OUTPUT	Urine	500		2026-03-09 10:49:53.129	\N	APPROVED
08cbb968-ebc0-443a-9e7c-44a15a1fefc4	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	360	N.S	2026-03-09 11:25:58.915	\N	APPROVED
400f3db9-3bac-44dc-ba2c-a17e72108fd0	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	40	G.S	2026-03-09 11:26:10.336	\N	APPROVED
7e63a1af-3089-4927-be25-ee817cf67cfc	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	160		2026-03-09 11:26:40.443	\N	APPROVED
e356907d-3a0d-4cc4-a984-548fb51da487	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	50		2026-03-09 10:20:40.237	0	PENDING_EDIT
c98d021f-b721-438c-97ce-91d6a40a9eaf	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	50		2026-03-09 10:20:52.003	0	PENDING_EDIT
45a14f1d-a421-49c5-953c-2dbe8cdb1286	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	720	NS	2026-03-09 12:30:52.606	\N	APPROVED
2abfc93b-058f-4115-9aab-8b0e06d259fa	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	50		2026-03-09 10:20:20.691	0	PENDING_EDIT
ae57a2d1-5c33-490b-adcf-6105e31d9cd5	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	mock-senior-id	c946ba3c-7001-484b-b5a1-639a3138ee07	OUTPUT	Urine	800		2026-03-09 13:00:24.012	\N	APPROVED
9a25beb4-6099-44bf-93bb-5ef98a62a096	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	360	ns	2026-03-09 14:02:46.858	\N	APPROVED
7fa8423a-f019-4c1c-958b-a10f1e1a8604	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	40	gs	2026-03-09 14:02:58.096	\N	APPROVED
ccb7299b-bb5e-4ff0-9eaa-b1cb1069c381	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	120		2026-03-09 14:03:12.33	\N	APPROVED
a50e1c79-d920-47f4-a075-25ea3e5a1ee8	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	OUTPUT	Urine	400		2026-03-09 14:03:43.357	\N	APPROVED
8e7ccc1b-d2b9-475b-acf9-7e3ba8ae2a72	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	270	ns	2026-03-09 14:15:41.318	\N	APPROVED
19c32a72-9adb-423a-b014-2bac5391e452	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	40	gs	2026-03-09 14:15:47.134	\N	APPROVED
3c3e6069-95c8-4dd2-8665-9b3c8e47d813	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	50		2026-03-09 14:15:59.016	\N	APPROVED
3ff8859f-7de9-4fac-822a-01b7d0b2b4c0	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	OUTPUT	Urine	300		2026-03-09 14:16:18.476	\N	APPROVED
9d1e4d89-03ff-414f-84ad-0b4cd0b8fd29	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	360	ns	2026-03-09 15:12:38.366	\N	APPROVED
16418096-2c7a-4cdf-97b3-70537f248076	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	IV Fluid	40	gs	2026-03-09 15:12:48.063	\N	APPROVED
b1864581-4ef2-4408-baf7-2436c38296cc	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	INPUT	PO Intake	110		2026-03-09 15:13:16.718	\N	APPROVED
d6611d5d-77a9-41c7-8e84-dacec6eaa6c3	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	OUTPUT	Urine	400		2026-03-09 15:13:35.575	\N	APPROVED
fbcea849-bd5a-4aa9-a5bd-1b91f9492b56	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	INPUT	Medication: Propofol	30	Auto-recorded from MAR administration (Dose: 10 mg/ml)	2026-03-09 21:28:36.953	\N	APPROVED
d638d9e7-a3db-449f-849c-4682146572bc	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	IV Fluid	60	gs	2026-03-10 08:32:50.644	\N	APPROVED
c9fb6d1c-640f-410e-96b0-f089327b23e0	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	OUTPUT	Urine	100		2026-03-10 08:34:09.695	\N	APPROVED
d4666953-0e66-40c1-a526-48e7f8a4b1cc	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	IV Fluid	60	gs	2026-03-10 09:03:34.177	\N	APPROVED
2562fd49-65c3-4b41-8616-b9bdc2e12b6b	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	IV Fluid	60	gs	2026-03-10 09:43:08.269	\N	APPROVED
b555a298-5c2b-4c0d-945f-52b8512b2c71	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	PO Intake	40		2026-03-10 09:43:15.115	\N	APPROVED
86512e63-8e5b-4d97-8949-05720092e140	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	OUTPUT	Urine	200		2026-03-10 09:43:26.069	\N	APPROVED
a4a23a71-6000-44bc-85dc-f9ba266181fb	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	IV Fluid	60	gs	2026-03-10 11:04:52.646	\N	APPROVED
cb72f307-ca00-44b0-aabd-caac9101a6e7	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	INPUT	PO Intake	40		2026-03-10 11:04:59.396	\N	APPROVED
78c1d2c3-bd71-4ea3-9ac4-7936f7bdcd86	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	bfa222c3-9f89-4b8e-877b-8cb727f17c07	OUTPUT	Urine	300		2026-03-10 11:05:07.295	\N	APPROVED
\.


--
-- Data for Name: Investigation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Investigation" (id, "patientId", "orderId", "authorId", type, category, title, status, result, impression, "conductedAt", "createdAt", "externalId", "updatedAt", "pdfFilename") FROM stdin;
ef58d0a5-5888-4ba3-9be2-2b353f77086a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Procalcitonin, Serum	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951015996-37.png", "Procalcitonin, Serum": 7.08}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.78	3120427	2026-03-09 18:28:23.514	\N
d3d9dbc9-5dd3-40e1-ba0b-0720b7c1ed03	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Urea, Serum": "104*", "Creatinine, Serum": "2.59"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.756	3120232	2026-03-09 18:28:23.514	\N
25a47781-f5e8-4100-b5c6-50aea4ba2d51	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Sodium, Serum": "131*", "Potassium, Serum": "3.96"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.771	3120232	2026-03-09 18:28:23.514	\N
b6d8d4e8-e983-4a61-a47d-6fd42db931f7	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Albumin, Serum": "2.75*"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.775	3120232	2026-03-09 18:28:23.514	\N
fc2a59b8-993b-4ac5-8d74-331f276f4a2f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Urea, Serum": "119*", "Creatinine, Serum": "3.14"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.907	3120427	2026-03-09 18:28:23.514	\N
7d301d18-dca1-4df8-85fe-e4715b366ca7	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Sodium, Serum": "131*", "Potassium, Serum": "3.99"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.912	3120427	2026-03-09 18:28:23.514	\N
8f122b09-077a-46ff-a0f4-93338513acbe	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-senior-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "8.9", "MCH": "29.5", "MCV": "88.1", "MPV": "9.8", "PCV": "26.6", "RBC": "3.02", "RDW": "17.0", "WBC": "8.0", "MCHC": "33.5", "imageUrl": "/uploads/sync-3119480-1771441400033-619.png", "Platelets": "231"}	Auto-synced from Lab Results	2026-02-18 00:00:00	2026-02-18 19:03:57.191	3119480	2026-03-09 18:28:23.514	\N
ad7a1b02-b12c-46ea-be06-55dbf49a6586	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-senior-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "7.5", "MCH": "29.4", "MCV": "89.8", "MPV": "9.6", "PCV": "22.9", "RBC": "2.55", "RDW": "17.5", "WBC": "5.7", "MCHC": "32.8", "imageUrl": "/uploads/sync-3118913-1771441406300-746.png", "Platelets": "345"}	Auto-synced from Lab Results	2026-02-16 00:00:00	2026-02-18 19:04:07.85	3118913	2026-03-09 18:28:23.514	\N
a5da3c01-64c5-4db1-b36c-546cbfa48519	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Albumin, Serum": "3.02*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.918	3120427	2026-03-09 18:28:23.514	\N
0c407861-9268-4121-bbfb-ddd0d6914442	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Procalcitonin, Serum	FINAL	{"imageUrl": "/uploads/sync-3120236-1771951638637-578.png", "Procalcitonin, Serum": "0.71"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:24.987	3120236	2026-03-09 18:28:23.514	\N
4aa379c5-cecc-4442-b760-6840069dae27	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function Test	FINAL	{"imageUrl": "/uploads/sync-3120236-1771951641597-967.png", "Urea, Serum": "36", "Sodium, Serum": "137", "Albumin, Serum": "3.26*", "Potassium, Serum": "3.77", "Creatinine, Serum": "1.20"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:25.261	3120236	2026-03-09 18:28:23.514	\N
7b442130-78b9-4175-ae9c-2d66ef5d7476	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.7", "MCH": "30.6", "MCV": "91.2", "MPV": "11.2*", "PCV": "*25.9", "RBC": "*2.84", "RDW": "13.6", "MCHC": "33.6", "imageUrl": "/uploads/sync-3120420-1771951632625-905.png", "Platelets": "203"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:25.573	3120420	2026-03-09 18:28:23.514	\N
2621cc20-dfd3-4fb0-a790-7a47c32888cb	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*11.0", "MCH": "28.3", "MCV": "85.1", "MPV": "8.9", "PCV": "*33.1", "RBC": "3.89", "RDW": "15.5*", "MCHC": "33.2", "imageUrl": "/uploads/sync-3120431-1771951740170-195.png", "Platelets": "326"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:06.86	3120431	2026-03-09 18:28:23.514	\N
1afd4f35-eb13-4362-b6bc-d85404806193	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120431-1771951743382-587.png", "Urea, Serum": "53*", "Creatinine, Serum": "0.50"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:07.069	3120431	2026-03-09 18:28:23.514	\N
61034f82-fdd8-418d-b5ac-8bd81525d5e2	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120431-1771951743382-587.png", "Sodium, Serum": "137", "Chloride, Serum": "102", "Potassium, Serum": "4.19"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:07.083	3120431	2026-03-09 18:28:23.514	\N
7511c908-27ec-4e26-8f02-9dd112ad1236	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Coagulation	Prothrombin Time	FINAL	{"INR": "1.70", "imageUrl": "/uploads/sync-3120381-1771959707232-534.png", "Prothrombin Time": "23.6*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 19:01:52.266	3120381	2026-03-09 18:28:23.514	\N
9b4020ef-1e3b-47f9-b8f1-21cbb1ab4938	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Coagulation	Partial Thromboplastin Time (PTT)	FINAL	{"PTT": "69.5*", "imageUrl": "/uploads/sync-3120381-1771959707232-534.png"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 19:01:52.285	3120381	2026-03-09 18:28:23.514	\N
3db34b4a-c4a4-4c84-a701-959759fe7a0d	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120428-1771959700626-586.png", "Urea, Serum": "62*", "Creatinine, Serum": "1.43"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:01:52.694	3120428	2026-03-09 18:28:23.514	\N
1f790639-289a-4119-8842-253e3ded7e41	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120428-1771959700626-586.png", "Sodium, Serum": "139", "Chloride, Serum": "101", "Potassium, Serum": "3.09*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:01:52.718	3120428	2026-03-09 18:28:23.514	\N
b51977f6-2d5c-4554-a2b6-12a5f12da396	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Hematology	Coagulation	FINAL	{"INR": "1.59", "PTT": "43.6*", "imageUrl": "/uploads/sync-3120428-1771959697365-76.png", "Prothrombin Time": "22.1*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:02:00.093	3120428	2026-03-09 18:28:23.514	\N
0f26c2a8-da7e-4858-8421-d560c2891f65	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "8.6", "MCH": "28.8", "MCV": "85.3", "MPV": "10.5", "PCV": "25.5", "RBC": "2.99", "RDW": "16.4", "WBC": "3.6", "MCHC": "33.7", "MID %": "4.50", "imageUrl": "/uploads/import-1771950952623.png", "MID %/cmm": "0.20", "Platelets": "30", "Lymphocytes": "13.3", "Neutrophils": "82.2", "Lymphocytes/cmm": "0.48", "Neutrophils/cmm": "2.96"}	Imported from Lab Results	2026-01-02 09:44:00	2026-02-24 16:35:57.035	\N	2026-03-09 18:28:23.514	\N
a2957913-1016-4e6f-bb81-03b887ab62e1	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Serology	C-Reactive Protein, Serum	FINAL	{"imageUrl": "/uploads/sync-3120268-1771951032976-972.png", "C-Reactive Protein, Serum": "156.00*"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.797	3120268	2026-03-09 18:28:23.514	\N
7ad4a684-3efe-4e26-86ec-1097b51048f6	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Pleural Fluid Analysis	FINAL	{"imageUrl": "/uploads/sync-3120398-1771951018641-126.png", "Protein, Pleural fluid": 1.9, "Lactate Dehydrogenase (LDH), Pleural fluid": 388}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.828	3120398	2026-03-09 18:28:23.514	\N
688ea102-6e45-4910-8fe3-e7d2aa6eef5b	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-nurse-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "10.1", "MCH": "29.5", "MCV": "90.4", "MPV": "9.4", "PCV": "30.9", "RBC": "3.42", "RDW": "16.0", "MCHC": "32.7", "imageUrl": "/uploads/sync-3120091-1771885824275-364.png", "Platelets": "262"}	Auto-synced from Lab Results	2026-02-22 00:00:00	2026-02-23 22:30:38.744	3120091	2026-03-09 18:28:23.514	\N
1905cb1e-ce44-45c5-8f7d-3ac29da55379	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.30", "PTT": "61.4*", "imageUrl": "/uploads/sync-3120232-1771951041537-223.png", "Prothrombin Time": "18.4*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.833	3120232	2026-03-09 18:28:23.514	\N
23ea43e4-145b-4347-b761-ba182e94a571	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.19", "PTT": "34.6", "imageUrl": "/uploads/sync-3120378-1771951029861-989.png", "Prothrombin Time": "17.0*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.886	3120378	2026-03-09 18:28:23.514	\N
7b2ca586-225f-4b4a-b3f5-ebc1be07933c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.32", "PTT": "57.9*", "imageUrl": "/uploads/sync-3120427-1771951008693-32.png", "Prothrombin Time": "18.7*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.89	3120427	2026-03-09 18:28:23.514	\N
cb8b31df-66c3-4bb5-b6ae-99548c0c7f0c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Differential count	FINAL	{"Gross": "Bloody", "Specimen": "Pleural Fluid", "imageUrl": "/uploads/sync-3120398-1771951021642-928.png", "Neutrophils": "80", "Total Cell Count": "300.0(many RBC seen/cut.)m"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.194	3120398	2026-03-09 18:28:23.514	\N
fa05e9c4-cecf-4d3c-86ec-f8b695a32ccd	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.6", "MCH": "28.8", "MCV": "85.3", "MPV": "10.5", "PCV": "*25.5", "RBC": "*2.99", "RDW": "16.4*", "MCHC": "33.7", "imageUrl": "/uploads/sync-3120427-1771951005673-851.png", "Platelets": "*30"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.293	3120427	2026-03-09 18:28:23.514	\N
b3d8030e-9b03-43d5-8025-8db54863ac7f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*7.7", "MCH": "28.5", "MCV": "85.2", "MPV": "8.8", "PCV": "*23.0", "RBC": "*2.70", "RDW": "16.8*", "MCHC": "33.5", "imageUrl": "/uploads/sync-3120378-1771951026819-890.png", "Platelets": "*46"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.351	3120378	2026-03-09 18:28:23.514	\N
da42e3e9-a6ab-4e59-91d6-47782a30459a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*7.9", "MCH": "28.2", "MCV": "84.3", "MPV": "9.5", "PCV": "*23.6", "RBC": "*2.80", "RDW": "16.5*", "MCHC": "33.5", "imageUrl": "/uploads/sync-3120232-1771951035804-638.png", "Platelets": "*34"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.755	3120232	2026-03-09 18:28:23.514	\N
eb112e65-f10f-4ec5-8658-b6c4ce829582	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.7", "MCH": "30.1", "MCV": "92.4", "MPV": "10.7", "PCV": "*26.7", "RBC": "*2.89", "RDW": "13.5", "MCHC": "32.6", "imageUrl": "/uploads/sync-3120236-1771951635585-902.png", "Platelets": "224"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:25.572	3120236	2026-03-09 18:28:23.514	\N
a6028d29-81ce-49b8-b17f-ab7f96221e6f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Urea, Serum": 38, "Creatinine, Serum": 1.23}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.361	3120420	2026-03-09 18:28:23.514	\N
aad2f094-d0cf-4941-94f6-a6735698ef42	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Sodium, Serum": 137, "Potassium, Serum": 3.81}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.368	3120420	2026-03-09 18:28:23.514	\N
b9b9f25b-0731-4315-a22a-3765494e664c	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Albumin, Serum": "2.90*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.375	3120420	2026-03-09 18:28:23.514	\N
193f7f19-0ac4-47ef-937f-25137d3022a9	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120615-1772061391513-868.png", "Urea, Serum": "65*", "Creatinine, Serum": "1.41"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-25 23:16:48.375	3120615	2026-03-09 18:28:23.514	\N
e1d78837-734b-42f9-8a37-b44bb7a9d7a8	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": "*8.6", "MCH": "27.7", "MCV": "86.1", "PCV": "*26.7", "RBC": "*3.10", "RDW": "20.2*", "WBC": "7.0", "MCHC": "32.2", "imageUrl": "/uploads/sync-3120615-1772061383592-729.png", "Platelets": "*82"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-25 23:16:48.4	3120615	2026-03-09 18:28:23.514	\N
565e1734-8360-42c7-ba21-87524c36b5fd	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120615-1772061391513-868.png", "Sodium, Serum": "139", "Chloride, Serum": "99", "Potassium, Serum": "3.38*"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-25 23:16:48.409	3120615	2026-03-09 18:28:23.514	\N
4a6dd693-3cb5-4209-8eb7-a32ef8aa91b2	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120233-1772061398029-501.png", "Urea, Serum": "55", "Creatinine, Serum": "1.23"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-25 23:16:48.53	3120233	2026-03-09 18:28:23.514	\N
c5ae37b5-0687-4c05-b3d1-06feb62a35bb	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120233-1772061398029-501.png", "Sodium, Serum": "138", "Chloride, Serum": "102", "Potassium, Serum": "3.19"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-25 23:16:48.536	3120233	2026-03-09 18:28:23.514	\N
9db1a6f1-2257-4252-ad52-61c08c280e36	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": "*7.1", "MCH": "27.3", "MCV": "85.4", "PCV": "*22.2", "RBC": "*2.60", "RDW": "19.5*", "WBC": "5.2", "MCHC": "32.0", "imageUrl": "/uploads/sync-3120233-1772061404348-589.png", "Platelets": "*61"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-25 23:16:48.562	3120233	2026-03-09 18:28:23.514	\N
a7e8115c-768e-4112-a146-7dbba434094f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187249239.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 48, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7\\nFemale: 0.5 - 0.9", "value": 1.03, "isAbnormal": false}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:00:52.91	226031064	2026-03-11 00:00:52.91	\N
c87d78d2-7821-4656-9576-23ee995bcd81	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	CRP	FINAL	{"imageUrl": "/uploads/import-1773187257521.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 86.6, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:01:07.433	226031030	2026-03-11 00:01:07.433	\N
2d58c897-8728-434a-9346-75dddcd554b7	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187257521.pdf", "Sodium, Serum": {"range": "136-146", "value": 138.5, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 105.2, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 5.43, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:01:07.449	226031030	2026-03-11 00:01:07.449	\N
6eb4c7c8-e222-4a72-9e1a-337540a6c839	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Serology	Tacrolimus, Trough Level, Blood	FINAL	{"Unit": "ng/mL", "imageUrl": "/uploads/sync-3120574-1772096126905-133.png", "Ref.Range": "5.0 - 15.0", "Tacrolimus, Trough Level, Blood": "2.5*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-26 08:55:47.144	3120574	2026-03-09 18:28:23.514	\N
6e799f1e-e6bd-403e-8461-c1e63ed820b5	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": "*9.5", "MCH": "29.1", "MCV": "89.9", "MPV": "9.8", "PCV": "*29.3", "RBC": "*3.26", "RDW": "13.0", "MCHC": "32.4", "imageUrl": "/uploads/sync-3120423-1772096133275-833.png", "Platelets": "309"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-26 08:55:47.196	3120423	2026-03-09 18:28:23.514	\N
30e24d5c-6380-4dae-ac7d-5f77287bbc83	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": "*8.9", "MCH": "29.3", "MCV": "90.1", "MPV": "10.5", "PCV": "*27.4", "RBC": "*3.04", "RDW": "12.8", "MCHC": "32.5", "imageUrl": "/uploads/sync-3120611-1772096119491-734.png", "Platelets": "284"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 08:55:47.401	3120611	2026-03-09 18:28:23.514	\N
56ae44a0-b088-4955-8d48-dc6f798fae8f	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120611-1772096111611-80.png", "Urea, Serum": "12*", "Creatinine, Serum": "0.63"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 08:55:47.605	3120611	2026-03-09 18:28:23.514	\N
a8bb22ae-4c4a-45de-b5db-b036e9ade007	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120611-1772096111611-80.png", "Sodium, Serum": "137", "Chloride, Serum": "101", "Potassium, Serum": "3.68"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 08:55:47.616	3120611	2026-03-09 18:28:23.514	\N
5b982a81-2f47-404d-bbf0-5934b780fa70	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120423-1772096142653-195.png", "Urea, Serum": "16*", "Creatinine, Serum": "0.71"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-26 08:55:49.874	3120423	2026-03-09 18:28:23.514	\N
f6dfc64e-11ac-4fdf-9fd8-455b2950220b	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120423-1772096142653-195.png", "Sodium, Serum": "136", "Chloride, Serum": "104", "Potassium, Serum": "3.31*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-26 08:55:49.885	3120423	2026-03-09 18:28:23.514	\N
169e5d9b-df9b-4e6f-a979-b9c5310845ab	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-nurse-id	LAB	Hematology	CBC	FINAL	{"Hb": "*9.6", "MCH": "29.4", "MCV": "90.5", "MPV": "10.0", "PCV": "*29.5", "RBC": "*3.26", "RDW": "12.9", "WBC": "13.8*", "MCHC": "32.5", "imageUrl": "/uploads/sync-3120238-1772096515201-910.png", "Platelets": "261"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-26 09:02:06.45	3120238	2026-03-09 18:28:23.514	\N
930a43df-1aaa-4315-abd0-6c6408310a15	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-nurse-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120238-1772096520440-398.png", "Urea, Serum": "18", "Creatinine, Serum": "0.64"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-26 09:02:06.549	3120238	2026-03-09 18:28:23.514	\N
3591d822-bda4-479b-b931-8563e50cd207	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-nurse-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120238-1772096520440-398.png", "Sodium, Serum": "144", "Chloride, Serum": "112*", "Potassium, Serum": "3.49*"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-26 09:02:06.555	3120238	2026-03-09 18:28:23.514	\N
4c9be27d-dbbc-403e-9e8e-67daccfc2683	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187257521.pdf", "Albumin, Serum": {"range": "3.5-5.2", "value": 3.4, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:01:07.461	226031030	2026-03-11 00:01:07.461	\N
7f053d04-9604-42b0-861c-d3d7cf67bdfa	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Coagulation	FINAL	{"imageUrl": "/uploads/import-1773187257521.pdf", "Natriuretic Peptide test (NTproBNP), Serum": {"range": null, "value": 2876, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:01:07.472	226031030	2026-03-11 00:01:07.472	\N
0617fb4f-e6b3-4d0e-a9dd-e16df580e09a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187360441.pdf", "Sodium, Serum": {"range": "136-146", "value": 140, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 100.1, "isAbnormal": false}, "Phosphate, Serum": {"range": "Child: Up to 6.0\\nAdult: 2.5-4.2", "value": 0.9, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 2.93, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:02:50.563	226030828	2026-03-11 00:02:50.563	\N
f5e4c2f3-109e-4c36-bb79-d49fa798890d	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-nurse-id	LAB	Hematology	CBC	FINAL	{"Hb": "*7.3", "MCH": "28.9", "MCV": "85.0", "MPV": "10.3", "PCV": "*21.5", "RBC": "*2.53", "RDW": "17.2*", "WBC": "*2.6", "MCHC": "34.0", "imageUrl": "/uploads/sync-3120614-1772103627567-5.png", "Platelets": "*16"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 11:00:47.776	3120614	2026-03-09 18:28:23.514	\N
70dc914c-814c-43e9-a2f5-b76fe634fd52	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-nurse-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120614-1772103639303-595.png", "Urea, Serum": "82*", "Creatinine, Serum": "2.07"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 11:00:50.586	3120614	2026-03-09 18:28:23.514	\N
517522b0-0177-4190-aa2c-f6acebee4ce2	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-nurse-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120614-1772103639303-595.png", "Sodium, Serum": "137", "Chloride, Serum": "99", "Potassium, Serum": "3.81"}	Auto-synced from Lab Results	2026-02-25 00:00:00	2026-02-26 11:00:50.609	3120614	2026-03-09 18:28:23.514	\N
185de8c7-f745-4efd-a1d4-2204122037bc	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Liver Function Test	FINAL	{"imageUrl": "/uploads/import-1773187360441.pdf", "Total Bilirubin, Serum": {"range": "0.2 - 1.2", "value": 17.1, "isAbnormal": true}, "Alkaline Phosphatase, Serum": {"range": "40-129", "value": 368, "isAbnormal": true}, "Alanine Aminotransferase (ALT), Serum": {"range": "< 41", "value": 21.9, "isAbnormal": false}, "Aspartate Aminotransferase (AST), Serum": {"range": "< 40", "value": 48, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:02:50.577	226030828	2026-03-11 00:02:50.577	\N
3e76d15b-764b-47a5-8e67-3fb43a1ea016	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-senior-id	LAB	External	Screenshot 2026-03-08 132118.png	FINAL	{"note": "AI Analysis Failed", "text": "{\\"note\\":\\"AI Analysis Failed\\"}", "imageUrl": "/uploads/files-1772965388130-413325252.png"}		2026-03-08 00:00:00	2026-03-08 10:23:09.379	\N	2026-03-09 18:28:23.514	\N
e885b240-c087-4724-8053-34e89f2f0d81	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-nurse-id	LAB	Biochemistry	CRP	FINAL	{"imageUrl": "/uploads/sync-226030743-1772994692293-729.png", "C-Reactive Protein": null}	Auto-synced from Lab Results	2001-07-02 06:14:00	2026-03-08 18:32:41.136	226030743	2026-03-09 18:28:23.514	\N
fc2f9912-5ea5-453e-b2af-65dfe851b614	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Biochemistry Panel	FINAL	{"imageUrl": "/uploads/import-1772999216760.pdf", "Urea, Serum": "73", "Sodium, Serum": "140", "Chloride, Serum": "100.1", "Phosphate, Serum": "0.9", "Potassium, Serum": "2.93", "Creatinine, Serum": "2.13", "Total Bilirubin, Serum": "17.1", "C-Reactive Protein, Serum": "101", "Alkaline Phosphatase, Serum": "368", "Alanine Aminotransferase (ALT), Serum": "21.9", "Aspartate Aminotransferase (AST), Serum": "48"}	Imported from Lab Results	2026-03-08 06:23:00	2026-03-08 19:47:02.371	\N	2026-03-09 18:28:23.514	\N
3930c192-6bcb-4727-b880-d324ab91a751	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": "8.6", "MCH": "29.76", "MCV": "82.35", "MPV": "11.9", "PCV": "23.8", "RBC": "2.89", "RDW": "19.3", "WBC": "7.6", "MCHC": "36.13", "imageUrl": "/uploads/import-1772999216760.pdf", "Platelets": "24", "Lymphocytes": "9.6", "Lymphocytes Absolute count": "0.73"}	Imported from Lab Results	2026-03-08 06:23:00	2026-03-08 19:47:02.592	\N	2026-03-09 18:28:23.514	\N
f49940ff-14a3-4cc8-9252-d6626efc647f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-2260306126-1772999874566-537.png"}	Auto-synced from Lab Results	2001-06-02 19:47:00	2026-03-08 19:58:59.133	2260306126	2026-03-09 18:28:23.514	\N
e69fd858-610b-4b4a-ad4a-8c27e6dc4fcc	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/sync-2260306126-1772999874566-537.png"}	Auto-synced from Lab Results	2001-06-02 19:47:00	2026-03-08 19:58:59.197	2260306126	2026-03-09 18:28:23.514	\N
4c6eacf8-d22d-4dc2-9173-7366555c02a2	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-2260306126-1772999874566-537.png"}	Auto-synced from Lab Results	2001-06-02 19:47:00	2026-03-08 19:58:59.209	2260306126	2026-03-09 18:28:23.514	\N
0dd6c532-df83-4037-a7a8-9f9612979ae0	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	Coagulation	FINAL	{"imageUrl": "/uploads/sync-2260306126-1772999874566-537.png"}	Auto-synced from Lab Results	2001-06-02 19:47:00	2026-03-08 19:58:59.22	2260306126	2026-03-09 18:28:23.514	\N
cad2e324-be67-410a-b1a5-064a246fad72	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"imageUrl": "/uploads/sync-2260306126-1772999874566-537.png"}	Auto-synced from Lab Results	2001-06-02 19:47:00	2026-03-08 19:58:59.233	2260306126	2026-03-09 18:28:23.514	\N
18cfbd46-247a-4b52-8466-504e314a8a22	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Total Bilirubin	FINAL	{"Unit": "mg/dL", "imageUrl": "/uploads/sync-226030690-1772999894251-754.png", "Reference range": "0.2-1.2", "Total Bilirubin, Serum": "14.4"}	Auto-synced from Lab Results	2001-06-02 13:19:00	2026-03-08 19:59:03.022	226030690	2026-03-09 18:28:23.514	\N
cb6ac568-abc2-4a9e-87bd-bfe7217783e6	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Serology	CRP	FINAL	{"Unit": "mg/L", "imageUrl": "/uploads/sync-226030690-1772999894251-754.png", "Reference range": "<6", "C-Reactive Protein, Serum": "61.5"}	Auto-synced from Lab Results	2001-06-02 13:19:00	2026-03-08 19:59:03.036	226030690	2026-03-09 18:28:23.514	\N
654a0105-aee1-485b-9d5a-8a1acb2b0ffd	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	CRP	FINAL	{"imageUrl": "/uploads/sync-226030626-1772999913503-298.png"}	Auto-synced from Lab Results	2001-06-02 06:31:00	2026-03-08 19:59:05.481	226030626	2026-03-09 18:28:23.514	\N
32069a8d-a7ef-40dc-b4e1-176b610f6019	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"imageUrl": "/uploads/sync-226030626-1772999913503-298.png"}	Auto-synced from Lab Results	2001-06-02 06:31:00	2026-03-08 19:59:05.491	226030626	2026-03-09 18:28:23.514	\N
1f8d82e6-3b08-4cd3-b581-12dc8a9d519a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-226030626-1772999913503-298.png"}	Auto-synced from Lab Results	2001-06-02 06:31:00	2026-03-08 19:59:05.504	226030626	2026-03-09 18:28:23.514	\N
89286b02-329c-4f9d-a3cc-78cef704fd15	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-226030626-1772999913503-298.png"}	Auto-synced from Lab Results	2001-06-02 06:31:00	2026-03-08 19:59:05.513	226030626	2026-03-09 18:28:23.514	\N
2466bdc1-acbe-4676-9c70-50f4788a3b63	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Coagulation	Coagulation	FINAL	{"imageUrl": "/uploads/sync-226030626-1772999913503-298.png"}	Auto-synced from Lab Results	2001-06-02 06:31:00	2026-03-08 19:59:05.523	226030626	2026-03-09 18:28:23.514	\N
aa9417d1-36a0-417d-a49b-8d917c6d9f10	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"imageUrl": "/uploads/sync-2260305200-1772999932990-474.png"}	Auto-synced from Lab Results	2001-05-02 17:56:00	2026-03-08 19:59:06.896	2260305200	2026-03-09 18:28:23.514	\N
647990ee-7e8f-4990-a92e-2e136af68bc7	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"imageUrl": "/uploads/sync-226030639-1773000021208-904.png"}	Auto-synced from Lab Results	2001-06-02 08:13:00	2026-03-08 20:00:46.904	226030639	2026-03-09 18:28:23.514	\N
73ebaeee-5147-4408-a258-7b605996a179	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-226030639-1773000021208-904.png"}	Auto-synced from Lab Results	2001-06-02 08:13:00	2026-03-08 20:00:46.981	226030639	2026-03-09 18:28:23.514	\N
3abc933f-db58-414b-9948-01d51f011a84	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-226030639-1773000021208-904.png"}	Auto-synced from Lab Results	2001-06-02 08:13:00	2026-03-08 20:00:46.992	226030639	2026-03-09 18:28:23.514	\N
02bae3d8-dfc0-4978-9673-fe156b41c5fa	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	CRP	FINAL	{"imageUrl": "/uploads/sync-226030639-1773000021208-904.png"}	Auto-synced from Lab Results	2001-06-02 08:13:00	2026-03-08 20:00:47.003	226030639	2026-03-09 18:28:23.514	\N
772d5a76-3fe3-4e1f-a0f1-8e0adc09191d	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Coagulation	Coagulation	FINAL	{"imageUrl": "/uploads/sync-226030639-1773000021208-904.png"}	Auto-synced from Lab Results	2001-06-02 08:13:00	2026-03-08 20:00:47.01	226030639	2026-03-09 18:28:23.514	\N
819adba9-b937-44a9-be10-8426ee3304da	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-226030454-1773000040828-97.png", "Sodium, Serum": 133.6, "Chloride, Serum": 100.3, "Potassium, Serum": 4.2}	Auto-synced from Lab Results	2001-04-02 07:47:00	2026-03-08 20:00:51.268	226030454	2026-03-09 18:28:23.514	\N
8b3e2cc6-5f8f-4cdf-9a53-d153330f23ba	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-226030454-1773000040828-97.png", "Urea, Serum": 39, "Creatinine, Serum": 0.92}	Auto-synced from Lab Results	2001-04-02 07:47:00	2026-03-08 20:00:51.286	226030454	2026-03-09 18:28:23.514	\N
94425e98-389f-47a1-b841-63ca85832499	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/sync-226030454-1773000040828-97.png", "C-Reactive Protein, Serum": 123}	Auto-synced from Lab Results	2001-04-02 07:47:00	2026-03-08 20:00:51.294	226030454	2026-03-09 18:28:23.514	\N
2a606389-cb8c-4acf-9dc1-92cb75e26102	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-226030454-1773000040828-97.png", "Albumin, Serum": 3.11}	Auto-synced from Lab Results	2001-04-02 07:47:00	2026-03-08 20:00:51.303	226030454	2026-03-09 18:28:23.514	\N
ba5342cc-e5ab-446c-a0e7-5b41091b4c92	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": 9.5, "PCV": 29.7, "RBC": 3.16, "imageUrl": "/uploads/sync-226030454-1773000040828-97.png"}	Auto-synced from Lab Results	2001-04-02 07:47:00	2026-03-08 20:00:51.313	226030454	2026-03-09 18:28:23.514	\N
d6e66b3a-9257-4bae-ace2-1f3c77c4b509	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773000279792.pdf", "Urea, Serum": 35, "Creatinine, Serum": 0.708}	Imported from Lab Results	2026-03-08 07:46:00	2026-03-08 20:04:47.385	\N	2026-03-09 18:28:23.514	\N
1c5f03b5-96b4-42d7-af09-b225273d2101	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773000279792.pdf", "Sodium, Serum": 135.4, "Chloride, Serum": 102.6, "Potassium, Serum": 4.31}	Imported from Lab Results	2026-03-08 07:46:00	2026-03-08 20:04:47.514	\N	2026-03-09 18:28:23.514	\N
77d5d4a4-3539-468b-afeb-37d1918c605c	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773000279792.pdf", "C-Reactive Protein, Serum": 127}	Imported from Lab Results	2026-03-08 07:46:00	2026-03-08 20:04:47.608	\N	2026-03-09 18:28:23.514	\N
6a240d83-30ae-4649-aba6-9abe8913b7d2	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Biochemistry	FINAL	{"imageUrl": "/uploads/import-1773000279792.pdf", "Albumin, Serum": 2.64, "Procalcitonin, Serum": 1.22}	Imported from Lab Results	2026-03-08 07:46:00	2026-03-08 20:04:47.699	\N	2026-03-09 18:28:23.514	\N
a9f5d31f-0259-4c93-8794-92fd7dc0ac2d	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": 9.2, "MCH": 29.58, "MCV": 90.68, "MPV": 11.3, "MXD": 1.7, "PCV": 28.2, "RBC": 3.11, "RDW": 13.8, "WBC": 16.3, "MCHC": 32.62, "MXD%": 10.4, "imageUrl": "/uploads/import-1773000279792.pdf", "Platelets": 172, "Lymphocytes": 1.52, "Neutrophils": 13.09, "Lymphocytes%": 9.3, "Neutrophils%": 80.3}	Imported from Lab Results	2026-03-08 07:46:00	2026-03-08 20:04:47.784	\N	2026-03-09 18:28:23.514	\N
9016c250-760d-4514-817c-a99ca7a6d76d	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 9.1, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.45, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 93.53, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 10.3, "isAbnormal": false}, "MXD": {"range": null, "value": 1.78, "isAbnormal": false}, "PCT": {"range": "0.2-0.36%", "value": 0.23, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 28.9, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 13.2, "isAbnormal": false}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 3.09, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 14, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 23.4, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 31.49, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187257521.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 225, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 3.07, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 18.56, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:01:07.486	226031030	2026-03-11 00:01:07.486	\N
f597f211-1582-40ce-bfbb-dd9b8b6d703a	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-226030624-1773001689065-827.png"}	Auto-synced from Lab Results	2001-06-02 06:28:00	2026-03-08 20:29:05.966	226030624	2026-03-09 18:28:23.514	\N
8ae16723-edc6-4f7e-bd0f-a304d7a18a7f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773187360441.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 101, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:02:50.59	226030828	2026-03-11 00:02:50.59	\N
481a6be1-2877-44cc-9547-4e968fac7d9a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.6, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.76, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 82.35, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 11.9, "isAbnormal": true}, "PCV": {"range": "40-50%", "value": 23.8, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.89, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 19.3, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 7.6, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 36.13, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187360441.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 24, "isAbnormal": true}, "Lymphocytes": {"range": null, "value": 9.6, "isAbnormal": false}, "Lymphocytes (Absolute count)": {"range": "1-3.5", "value": 0.73, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:02:50.621	226030828	2026-03-11 00:02:50.621	\N
5717608b-0f11-44b0-936f-4ef76181bbcb	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187454109.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 45, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7\\n1.2\\nFemale: 0.5 - 0.9", "value": 0.49, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:04:23.161	2260307132	2026-03-11 00:04:23.161	\N
ff7fe0c1-7efe-434d-ad04-f99db591cc85	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187273875.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 35, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": 0.708, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.559	226030852	2026-03-11 00:01:24.559	\N
f58f3545-e3a1-4cdd-8ecf-f866af717706	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187273875.pdf", "Sodium, Serum": {"range": "136-146", "value": 135.4, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 102.6, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 4.31, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.586	226030852	2026-03-11 00:01:24.586	\N
f71f6663-bd85-4ad6-82ce-003e3f9f5cfd	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773187273875.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 127, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.597	226030852	2026-03-11 00:01:24.597	\N
d91f881a-2e2e-4f0a-90ef-59ae7d8433d1	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/import-1773187273875.pdf", "Albumin, Serum": {"range": "3.5 - 5.2", "value": 2.64, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.608	226030852	2026-03-11 00:01:24.608	\N
3f05b498-ee11-4e96-b61f-43b06257ed22	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Procalcitonin	FINAL	{"imageUrl": "/uploads/import-1773187273875.pdf", "Procalcitonin, Serum": {"range": "Normal: 0.0 - 0.5\\nMild: 0.5-2.0\\nModerate: 2.0-10.0\\nSevere: > 10", "value": 1.22, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.619	226030852	2026-03-11 00:01:24.619	\N
704e86ef-abc4-410e-84bb-2ffc4a0366b4	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 9.2, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.58, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 90.68, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 11.3, "isAbnormal": true}, "MXD": {"range": null, "value": 10.4, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 28.2, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 3.11, "isAbnormal": true}, "RDW": {"range": "11.6-14%", "value": 13.8, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 16.3, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 32.62, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187273875.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 172, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 1.52, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 13.09, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:01:24.63	226030852	2026-03-11 00:01:24.63	\N
510cadf9-993b-4c32-9661-0df71e92be5e	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187374835.pdf", "Sodium, Serum": {"range": "136-146", "value": 135.5, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:02:57.478	2260310217	2026-03-11 00:02:57.478	\N
a788f4a0-3e91-41f3-9ff3-9e83c5736e87	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	External	Lab Report	FINAL	{"imageUrl": "/uploads/import-1773187392980.png"}	Auto-synced (Analysis failed/skipped)	2015-09-16 00:00:00	2026-03-11 00:03:19.189	2260310188	2026-03-11 00:03:19.189	\N
8602cb95-1acb-4a07-abe7-0533791a237e	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Sodium, Serum	FINAL	{"imageUrl": "/uploads/import-1773187402547.pdf", "Sodium, Serum": {"range": "136-146", "value": 132, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:03:25.303	2260310106	2026-03-11 00:03:25.303	\N
12e96608-f96b-4d94-901c-a0af1977c1be	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187408550.pdf", "Sodium, Serum": {"range": "136-146", "value": 131, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 96.4, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 4.77, "isAbnormal": false}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:03:31.839	226031038	2026-03-11 00:03:31.839	\N
09acdf8c-616c-4e41-a087-ffbcbdb13761	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Osmolality and Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187415365.pdf", "Sodium, Serum": {"range": "136-146", "value": 128, "isAbnormal": true}, "Uric acid, Serum": {"range": "3.4 -7", "value": 1.9, "isAbnormal": true}, "Osmolality, Serum": {"range": "275-295", "value": 283.24, "isAbnormal": false}, "Osmolality, Random, Urine": {"range": "50 - 1200", "value": 385.96, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:03:38.824	2260309149	2026-03-11 00:03:38.824	\N
17656c5e-3473-42b3-adf3-7dd8900d3619	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Sodium, Serum	FINAL	{"imageUrl": "/uploads/import-1773259255091.pdf", "Sodium, Serum": {"range": "136-146", "value": 139, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-11 22:00:00	2026-03-11 20:00:58.05	2260311236	2026-03-11 20:00:58.05	\N
0b799ad9-1836-455b-86d9-e6517714f90a	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187289478.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 33, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": 0.95, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:01:38.54	2260309211	2026-03-11 00:01:38.54	\N
3aed2ebd-8026-4000-8f5c-dd258eac30b1	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187289478.pdf", "Sodium, Serum": {"range": "136 - 146", "value": 157, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 111.8, "isAbnormal": true}, "Potassium, Serum": {"range": "3.5-5", "value": 1.54, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:01:38.555	2260309211	2026-03-11 00:01:38.555	\N
5d277acf-0de2-49b0-b0c2-fe0db1b173c1	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/import-1773187289478.pdf", "Albumin, Serum": {"range": "3.5-5.2", "value": 1.95, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:01:38.565	2260309211	2026-03-11 00:01:38.565	\N
d5b79fdb-8fcd-4c10-840b-5ac464a2cb52	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 6.9, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 31.22, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 96.83, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 9.7, "isAbnormal": false}, "MXD": {"range": null, "value": 0.26, "isAbnormal": false}, "PCT": {"range": "0.2 - 0.36%", "value": 0.1, "isAbnormal": true}, "PCV": {"range": "40-50%", "value": 21.4, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 13, "isAbnormal": false}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.21, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 16.7, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 6.6, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 32.24, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187289478.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 102, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 0.85, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 5.49, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:01:38.577	2260309211	2026-03-11 00:01:38.577	\N
ba1e3e0d-c69c-4a4a-8744-3cd6babeee97	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187422730.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 31, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 1.2\\nFemale: 0.5 - 0.9", "value": 0.5, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:03:51.19	226030928	2026-03-11 00:03:51.19	\N
191e2ff0-26fb-4839-a444-edd86d4ba242	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187422730.pdf", "Sodium, Serum": {"range": "136-146", "value": 129, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 92.9, "isAbnormal": true}, "Potassium, Serum": {"range": "3.5-5", "value": 4.57, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:03:51.204	226030928	2026-03-11 00:03:51.204	\N
3601a633-44d7-4584-81ef-74dd7cb9097f	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 7.7, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.73, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 88.42, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 9.8, "isAbnormal": false}, "MXD": {"range": null, "value": 0.56, "isAbnormal": false}, "PCT": {"range": "0.2 - 0.36%", "value": 0.17, "isAbnormal": true}, "PCV": {"range": "40-50%", "value": 22.9, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 11.5, "isAbnormal": false}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.59, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 12.8, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 11, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 33.62, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187422730.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 178, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 0.54, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 9.9, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:03:51.215	226030928	2026-03-11 00:03:51.215	\N
08405e2a-db56-4613-8740-9bbb92e7a91a	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187434489.pdf", "Sodium, Serum": {"range": "136-146", "value": 129.7, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:03:57.131	2260308238	2026-03-11 00:03:57.131	\N
ab225954-786c-4038-91cd-fe3436ba1f13	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187441051.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 35, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": 0.607, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:04:10.244	226030841	2026-03-11 00:04:10.244	\N
b446e042-187b-4a09-92af-5b35f094394f	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	Reports	FINAL	{"Reports": {"range": null, "value": 63, "isAbnormal": false}, "imageUrl": "/uploads/import-1773216396493.png"}	Auto-synced from Lab Results	2026-03-10 01:03:00	2026-03-11 08:06:40.55	22603105	2026-03-11 08:06:40.55	\N
acbecb59-bdfa-4f15-a239-4cf4656612cc	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773045425534.pdf", "Urea, Serum": 31, "Creatinine, Serum": 0.5}	Imported from Lab Results	2026-03-09 06:26:00	2026-03-09 08:37:11.079	\N	2026-03-09 18:28:23.514	\N
1fd6246f-a52e-4680-b7a2-a35e0f0e12fd	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773045425534.pdf", "Sodium, Serum": 129, "Chloride, Serum": 92.9, "Potassium, Serum": 4.57}	Imported from Lab Results	2026-03-09 06:26:00	2026-03-09 08:37:11.237	\N	2026-03-09 18:28:23.514	\N
4cf4aac4-3712-4841-a0aa-e3fb610c7938	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Hematology	Coagulation	FINAL	{"INR": 3.57, "PTT": 89.68, "imageUrl": "/uploads/import-1773065510754.pdf", "Prothrombin Time": 46.16, "Normal Control Plasma": 14.3}	Imported from Lab Results	2026-03-09 09:11:00	2026-03-09 14:11:54.908	\N	2026-03-09 18:28:23.514	\N
8e288635-8575-4f9b-a6f7-16fbab21bba8	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	LAB	Hematology	CBC	FINAL	{"Hb": 7.7, "MCH": 29.73, "MCV": 88.42, "MXD": 5.1, "PCT": 0.17, "PCV": 22.9, "PDW": 11.5, "RBC": 2.59, "RDW": 12.8, "MCHC": 33.62, "imageUrl": "/uploads/import-1773045425534.pdf", "Platelets": 178, "Lymphocytes": 4.9, "Neutrophils": 90, "MXD Absolute count": 0.56, "Lymphocytes Absolute count": 0.54, "Neutrophils Absolute count": 9.9}	Imported from Lab Results	2026-03-09 06:26:00	2026-03-09 08:37:11.358	\N	2026-03-09 18:28:23.514	\N
666f6ba0-34ea-4ea5-9729-6dfa9a9d9416	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187302927.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 99, "isAbnormal": true}, "Creatinine, Serum": {"range": "Male: 0.7\\n1.2\\nFemale: 0.5 - 0.9", "value": 1.17, "isAbnormal": false}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:01:52.965	226030749	2026-03-11 00:01:52.965	\N
f9602332-7ec4-4e0c-b9c2-8249fadb54cb	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187302927.pdf", "Sodium, Serum": {"range": "136-146", "value": 144.2, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 104.6, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 5.45, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:01:52.98	226030749	2026-03-11 00:01:52.98	\N
0d1fb663-5045-4764-995d-27270e087b4d	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773187302927.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 83.7, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:01:52.997	226030749	2026-03-11 00:01:52.997	\N
78dde2a6-e29f-432a-84b4-1a5d06428578	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Procalcitonin	FINAL	{"imageUrl": "/uploads/import-1773187302927.pdf", "Procalcitonin, Serum": {"range": "Normal: 0.0 - 0.5\\nMild: 0.5-2.0\\nModerate: 2.0 -10.0\\nSevere: > 10", "value": 11.1, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:01:53.007	226030749	2026-03-11 00:01:53.007	\N
d7f83a71-36da-4bf8-80c7-e176777c35e5	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 7.8, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 28.78, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 93.73, "isAbnormal": false}, "MXD": {"range": null, "value": 0.04, "isAbnormal": false}, "PCV": {"range": "40-50 %", "value": 25.4, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.71, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 19.1, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 2.3, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 30.71, "isAbnormal": true}, "imageUrl": "/uploads/import-1773187302927.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 33, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 1.23, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 1.03, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:01:53.017	226030749	2026-03-11 00:01:53.017	\N
4814f049-95b8-41f2-80db-901833f5be71	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	5a476d92-d719-4322-a10f-b6f747686e00	LAB	Biochemistry	Osmolality, Uric Acid, Sodium	FINAL	{"imageUrl": "/uploads/import-1773077486904.pdf", "Sodium, Serum": "128", "Uric acid, Serum": "1.9", "Osmolality, Serum": "283.24", "Osmolality, Random, Urine": "385.96"}	Imported from Lab Results	2026-03-09 13:30:00	2026-03-09 17:31:31.594	\N	2026-03-09 18:28:23.514	\N
96b81008-3cd3-4e5f-8dfa-d7243aaa434f	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187441051.pdf", "Sodium, Serum": {"range": "136 - 146", "value": 133.1, "isAbnormal": true}, "Chloride, Serum": {"range": "96 - 106", "value": 101.3, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5 - 5", "value": 4.55, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:04:10.255	226030841	2026-03-11 00:04:10.255	\N
5e3741c3-7712-490d-b5f3-2d0d431d9f85	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773187441051.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 39.6, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:04:10.265	226030841	2026-03-11 00:04:10.265	\N
9942e30e-218f-46c9-b0be-62d0c8ad25b3	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 7.3, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 28.97, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 88.89, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 9.6, "isAbnormal": false}, "MXD": {"range": null, "value": 0.32, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 22.4, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.52, "isAbnormal": true}, "RDW": {"range": "11.6-14%", "value": 12.4, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 7.1, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 32.59, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187441051.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 208, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 0.41, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 6.37, "isAbnormal": false}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:04:10.272	226030841	2026-03-11 00:04:10.272	\N
5d142492-cc51-4c6d-82d1-21da668e303c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773128769801.pdf", "Sodium, Serum": {"range": "136-146", "value": 141, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 99.1, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 2.8, "isAbnormal": true}}	Imported from Lab Results	2026-03-10 06:33:00	2026-03-10 07:46:14.277	\N	2026-03-10 07:46:14.277	\N
cb3ee053-f43f-426e-bbb1-2e2d35540a27	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	mock-senior-id	IMAGING	Radiology	WhatsApp Image 2026-03-08 at 1.28.43 PM.jpeg	FINAL	{"note": "Manual Upload", "text": "{\\"note\\":\\"Manual Upload\\"}", "imageUrl": "/uploads/files-1773088956660-164902633.jpeg"}		2026-03-09 00:00:00	2026-03-09 20:42:37.224	\N	2026-03-09 20:42:37.224	\N
7d29d42f-f18d-4c59-a02b-8643e636895c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	mock-senior-id	LAB	Cardiology	WhatsApp Image 2026-03-08 at 1.28.43 PM.jpeg	FINAL	{"note": "Manual Upload", "text": "{\\"note\\":\\"Manual Upload\\"}", "imageUrl": "/uploads/files-1773095767338-358335924.jpeg"}		2026-03-09 00:00:00	2026-03-09 22:36:07.895	\N	2026-03-09 22:36:07.895	\N
751ffb08-c9d2-489e-9283-4ac66a8a5d28	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187317607.pdf", "Sodium, Serum": {"range": "136-146", "value": 141, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 99.1, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 2.8, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:02:04.852	226031031	2026-03-11 00:02:04.852	\N
e2871f30-f128-44b1-99b3-963c43cefd00	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 7.7, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 30.1, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 83.6, "isAbnormal": false}, "MXD": {"range": null, "value": 0.3, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 21.4, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.56, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 19.9, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 12.1, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 36, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187317607.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 35, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 1.2, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 10.6, "isAbnormal": true}}	Auto-synced from Lab Results	2015-09-16 00:00:00	2026-03-11 00:02:04.872	226031031	2026-03-11 00:02:04.872	\N
2b9a5d60-11ff-423b-8d0b-9edd1ea8eb1d	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Albumin, Serum	FINAL	{"imageUrl": "/uploads/import-1773187329336.pdf", "Albumin, Serum": {"range": "3.5-5.2", "value": 3.05, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:12.18	2260309223	2026-03-11 00:02:12.18	\N
e328e44b-e41c-46c0-b8f6-dd0a4a4a2a49	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	Coagulation	FINAL	{"INR": {"range": "Normal: 1- 1.15\\nTherapeutic: 2 - 3", "value": 3.57, "isAbnormal": true}, "PTT": {"range": "26-40", "value": 89.68, "isAbnormal": true}, "imageUrl": "/uploads/import-1773187335718.pdf", "Prothrombin Time": {"range": "11-16", "value": 46.16, "isAbnormal": true}, "Normal Control Plasma": {"range": null, "value": 14.3, "isAbnormal": false}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:19.343	226030965	2026-03-11 00:02:19.343	\N
90a99eff-440c-460e-985f-335bdc408fe0	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187343819.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 92, "isAbnormal": true}, "Creatinine, Serum": {"range": "Male: 0.7 1.2\\nFemale: 0.5 - 0.9", "value": 1.72, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:36.036	226030922	2026-03-11 00:02:36.036	\N
94d62350-8c70-44c7-bd84-41dfc6fcf864	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187343819.pdf", "Sodium, Serum": {"range": "136-146", "value": 143, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 100.5, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 2.81, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:36.056	226030922	2026-03-11 00:02:36.056	\N
3d5f48e0-950d-4ffb-8917-ea8a464fcfb3	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Liver Function Test	FINAL	{"imageUrl": "/uploads/import-1773187343819.pdf", "Phosphate, Serum": {"range": "Child: Up to 6.0\\nAdult: 2.5-4.2", "value": 1.9, "isAbnormal": false}, "Total Bilirubin, Serum": {"range": "0.2 - 1.2", "value": 19.53, "isAbnormal": true}, "Alkaline Phosphatase, Serum": {"range": "40-129", "value": 426, "isAbnormal": true}, "Alanine Aminotransferase (ALT), Serum": {"range": "< 41", "value": 21.1, "isAbnormal": false}, "Aspartate Aminotransferase (AST), Serum": {"range": "< 40", "value": 47.4, "isAbnormal": true}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:36.069	226030922	2026-03-11 00:02:36.069	\N
15ab0edb-82e5-426e-bee9-5f5a8cb68c91	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.3, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 30.4, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 82.78, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 11.1, "isAbnormal": true}, "PCT": {"range": "0.2-0.36%", "value": 0.04, "isAbnormal": true}, "PCV": {"range": "40-50%", "value": 22.6, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 18.5, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.73, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 20.1, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 7.2, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 36.73, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187343819.pdf", "Monocytes": {"range": "0.2 - 1", "value": 0.5, "isAbnormal": false}, "Platelets": {"range": "150-450 10^9/L", "value": 37, "isAbnormal": true}, "Eosinophils": {"range": "0.02 - 0.5", "value": 0.22, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 0.72, "isAbnormal": true}, "Monocytes %": {"range": null, "value": 7, "isAbnormal": null}, "Neutrophils": {"range": "2-7", "value": 5.76, "isAbnormal": false}, "Eosinophils %": {"range": null, "value": 3, "isAbnormal": null}, "Lymphocytes %": {"range": null, "value": 10, "isAbnormal": null}, "Neutrophils %": {"range": null, "value": 80, "isAbnormal": null}}	Auto-synced from Lab Results	2014-09-16 00:00:00	2026-03-11 00:02:36.085	226030922	2026-03-11 00:02:36.085	\N
12eaea17-bacc-4981-9412-ff0cf6d5c60d	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773187360441.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 73, "isAbnormal": true}, "Creatinine, Serum": {"range": "Male: 0.7 1.2\\nFemale: 0.5 - 0.9", "value": 2.13, "isAbnormal": true}}	Auto-synced from Lab Results	2013-09-16 00:00:00	2026-03-11 00:02:50.543	226030828	2026-03-11 00:02:50.543	\N
f195f321-304d-4153-9367-086b93c265b0	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	mock-senior-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773146962191.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 48, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": 1.03, "isAbnormal": false}}	Imported from Lab Results	2026-03-10 10:46:00	2026-03-10 12:49:26.91	\N	2026-03-10 12:49:26.91	\N
e7ce4d62-ba7d-4575-b341-ebab195b4039	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773187454109.pdf", "Sodium, Serum": {"range": "136-146", "value": 137, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 99.4, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 3.75, "isAbnormal": false}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:04:23.171	2260307132	2026-03-11 00:04:23.171	\N
d010566c-242b-41b3-a04f-729637af65b7	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773187454109.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 24.4, "isAbnormal": true}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:04:23.185	2260307132	2026-03-11 00:04:23.185	\N
5e5a6c19-b898-4f4a-98e8-6f0076d5a061	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.3, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.43, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 87.94, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 9.6, "isAbnormal": false}, "MXD": {"range": null, "value": 3.1, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 24.8, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.82, "isAbnormal": true}, "RDW": {"range": "11.6-14%", "value": 12.5, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 7, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 33.47, "isAbnormal": false}, "imageUrl": "/uploads/import-1773187454109.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 260, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 0.4, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 6.38, "isAbnormal": false}}	Auto-synced from Lab Results	2012-09-15 00:00:00	2026-03-11 00:04:23.196	2260307132	2026-03-11 00:04:23.196	\N
02b1482e-e7e3-44d8-8bc7-aa99662e8b99	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773216407564.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 32, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": 0.46, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-08 12:08:00	2026-03-11 08:06:56.808	226030867	2026-03-11 08:06:56.808	\N
98011f56-cace-428d-8636-36006cfc866b	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773216407564.pdf", "Sodium, Serum": {"range": "136-146", "value": 132.5, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 98.3, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 4.23, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-08 12:08:00	2026-03-11 08:06:56.834	226030867	2026-03-11 08:06:56.834	\N
3733f1f9-fcfe-458c-a6ea-7d269da0e630	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773216407564.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 120, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-08 12:08:00	2026-03-11 08:06:56.853	226030867	2026-03-11 08:06:56.853	\N
03cec3be-6879-4148-856d-74f684657a37	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.7, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.49, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 87.8, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 8, "isAbnormal": false}, "MXD": {"range": null, "value": 0.94, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 25.9, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.95, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 13.3, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 10.7, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 33.59, "isAbnormal": false}, "imageUrl": "/uploads/import-1773216407564.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 659, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 1.32, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 8.44, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-08 12:08:00	2026-03-11 08:06:56.871	226030867	2026-03-11 08:06:56.871	\N
6f45481f-f064-4dcb-b4b0-9a0109d14d8a	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	Blood Compatibility Test	FINAL	{"imageUrl": "/uploads/import-1773212458767.pdf", "Donor name": {"range": null, "value": ".", "isAbnormal": false}, "Blood pint ID": {"range": null, "value": "17060", "isAbnormal": false}, "Antiglobulin Crossmatch": {"range": null, "value": "Compatible", "isAbnormal": false}, "Immediate Spin Crossmatch": {"range": null, "value": "Compatible", "isAbnormal": false}, "Donor Blood Group (ABO & Rh)": {"range": null, "value": "B Rh D Postivie (B+)", "isAbnormal": false}, "Recipient Blood Group (ABO & Rh)": {"range": null, "value": "B Rh D Positive (B +)", "isAbnormal": false}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:03.824	226030699	2026-03-11 07:01:03.824	\N
06c806b3-b081-4a4b-b620-51089ff4b54b	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Liver Function Test	FINAL	{"imageUrl": "/uploads/import-1773212470266.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 82, "isAbnormal": true}, "Sodium, Serum": {"range": "136-146", "value": 143, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 103.4, "isAbnormal": false}, "Phosphate, Serum": {"range": "Child: Up to 6.0\\nAdult: 2.5-4.2", "value": 2.6, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 4.28, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7 1.2\\nFemale: 0.5 - 0.9", "value": 0.93, "isAbnormal": false}, "Calcium, Total, Serum": {"range": "< 1 year: 8.7-11.0 mg/dL\\n1-17 years: 9.3-10.6 mg/dL\\n18-59 years: 8.6-10.0 mg/dL\\n> or = 60 years: 8.8-10.2\\nmg/dL", "value": 8.98, "isAbnormal": false}, "Total Bilirubin, Serum": {"range": "0.2 - 1.2", "value": 2.42, "isAbnormal": true}, "Alkaline Phosphatase, Serum": {"range": "40-129", "value": 161, "isAbnormal": true}, "Alanine Aminotransferase (ALT), Serum": {"range": "< 41", "value": 72.1, "isAbnormal": true}, "Aspartate Aminotransferase (AST), Serum": {"range": "< 40", "value": 437, "isAbnormal": true}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.021	226030627	2026-03-11 07:01:25.021	\N
1600452d-cf3d-461a-ab2c-8ba6ea7c8861	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773212470266.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 66.8, "isAbnormal": true}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.05	226030627	2026-03-11 07:01:25.05	\N
bf48293c-1968-485e-bd25-6b028d587f65	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	Coagulation	FINAL	{"INR": {"range": "Normal: 1- 1.15\\nTherapeutic: 2 - 3", "value": 1.74, "isAbnormal": true}, "PTT": {"range": "26-40", "value": 41.83, "isAbnormal": true}, "imageUrl": "/uploads/import-1773212470266.pdf", "Prothrombin Time": {"range": "11-16", "value": 23.95, "isAbnormal": true}, "Normal Control Plasma": {"range": null, "value": 14.3, "isAbnormal": false}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.063	226030627	2026-03-11 07:01:25.063	\N
fc0b8fb3-8f54-4c9d-ab70-59d5627e3006	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Procalcitonin	FINAL	{"imageUrl": "/uploads/import-1773212470266.pdf", "Procalcitonin, Serum": {"range": "Normal: 0.0 - 0.5\\nMild: 0.5-2.0\\nModerate: 2.0 -10.0\\nSevere: > 10", "value": 4.66, "isAbnormal": true}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.078	226030627	2026-03-11 07:01:25.078	\N
50abf240-2c7f-4e9e-9b10-c791e7f23c75	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.2, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 28.87, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 89.08, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 10.4, "isAbnormal": false}, "MXD": {"range": null, "value": 1.2, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 25.3, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.84, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 18.3, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 9.1, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 32.41, "isAbnormal": false}, "imageUrl": "/uploads/import-1773212470266.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 68, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 0.75, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 8.24, "isAbnormal": true}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.093	226030627	2026-03-11 07:01:25.093	\N
7a635a4e-27d1-455c-8a8c-c48f75047de6	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Fibrinogen	FINAL	{"imageUrl": "/uploads/import-1773212470266.pdf", "Fibrinogen": {"range": "180-360", "value": 182.6, "isAbnormal": false}}	Auto-synced from Lab Results	2011-09-16 00:00:00	2026-03-11 07:01:25.11	226030627	2026-03-11 07:01:25.11	\N
67b97923-ad88-444b-a50b-8098a9c85bde	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Coagulation	Coagulation	FINAL	{"INR": {"range": "Normal: 1- 1.15\\nTherapeutic: 2 - 3", "value": "5.55", "isAbnormal": true}, "PTT": {"range": "26-40", "value": "83.77", "isAbnormal": true}, "imageUrl": "/uploads/import-1773212489527.pdf", "Prothrombin Time": {"range": "11-16", "value": "68.91", "isAbnormal": true}, "Normal Control Plasma": {"range": null, "value": "14.3", "isAbnormal": false}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:37.277	2260305186	2026-03-11 07:01:37.277	\N
0ea9443a-1ba0-4baa-829d-6331830c4732	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	mock-senior-id	LAB	External	Lab Report	FINAL	{"imageUrl": "/uploads/import-1773216428424.png"}	Auto-synced (Analysis failed/skipped)	2026-03-10 01:03:00	2026-03-11 08:07:14.588	22603105	2026-03-11 08:07:14.588	\N
76a54196-c81a-4cac-b79f-6b03d0448d0f	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": "6.3", "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": "28.6", "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": "90.9", "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": "11.2", "isAbnormal": true}, "MXD": {"range": null, "value": "0.2", "isAbnormal": false}, "PCV": {"range": "40-50%", "value": "20", "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": "2.2", "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": "22.3", "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": "13.6", "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": "31.5", "isAbnormal": false}, "imageUrl": "/uploads/import-1773212489527.pdf", "Platelets": {"range": "150-450 10^9/L", "value": "102", "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": "1.4", "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": "12", "isAbnormal": true}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:37.29	2260305186	2026-03-11 07:01:37.29	\N
81de6729-7251-44b2-bc79-23ed0c272ff1	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	C-Reactive Protein, Serum	FINAL	{"imageUrl": "/uploads/import-1773212501910.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": "100", "isAbnormal": true}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:51.356	226030546	2026-03-11 07:01:51.356	\N
adb8811f-2fc1-45d9-a08c-a80c1f888e6c	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773212501910.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": "93", "isAbnormal": true}, "Creatinine, Serum": {"range": "Male: 0.7 - 1.2\\nFemale: 0.5 - 0.9", "value": "1.2", "isAbnormal": true}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:51.367	226030546	2026-03-11 07:01:51.367	\N
f7046401-4608-4551-b4d5-999bb9704366	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773212501910.pdf", "Sodium, Serum": {"range": "136 - 146", "value": "147", "isAbnormal": true}, "Chloride, Serum": {"range": "96 - 106", "value": "105.4", "isAbnormal": false}, "Potassium, Serum": {"range": "3.5 - 5", "value": "5.06", "isAbnormal": true}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:51.378	226030546	2026-03-11 07:01:51.378	\N
5fe961a3-57c0-494d-b48f-a3dca1f2f7df	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": "7.2", "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": "27.69", "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": "91.92", "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": "11.7", "isAbnormal": true}, "PCV": {"range": "40 - 50%", "value": "23.9", "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": "2.6", "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": "22.9", "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": "13.7", "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": "30.13", "isAbnormal": true}, "MXD (%)": {"range": null, "value": "1.7", "isAbnormal": false}, "imageUrl": "/uploads/import-1773212501910.pdf", "Platelets": {"range": "150-450 10^9/L", "value": "118", "isAbnormal": true}, "Lymphocytes": {"range": null, "value": "12.3", "isAbnormal": false}, "Neutrophils": {"range": null, "value": "86", "isAbnormal": false}, "MXD (Absolute count)": {"range": null, "value": "0.23", "isAbnormal": false}, "Lymphocytes (Absolute count)": {"range": "1-3.5", "value": "1.69", "isAbnormal": false}, "Neutrophils (Absolute count)": {"range": "2-7", "value": "11.78", "isAbnormal": true}}	Auto-synced from Lab Results	2010-09-16 00:00:00	2026-03-11 07:01:51.387	226030546	2026-03-11 07:01:51.387	\N
7a7dc742-a5ec-4846-bb3e-f2a0cd7f9327	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773212515712.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 125, "isAbnormal": true}, "Creatinine, Serum": {"range": "Male: 0.7\\n1.2\\nFemale: 0.5 - 0.9", "value": 2.03, "isAbnormal": true}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:05.092	226030444	2026-03-11 07:02:05.092	\N
0c539269-f2a0-41c0-9d55-40556e4e5ed5	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773212515712.pdf", "Sodium, Serum": {"range": "136-146", "value": 152, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 103.6, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 5.28, "isAbnormal": true}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:05.108	226030444	2026-03-11 07:02:05.108	\N
06d0a1d1-ad85-4911-ac6d-7c8a62aab7e7	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/import-1773212515712.pdf", "Albumin, Serum": {"range": "3.5-5.2", "value": 3.54, "isAbnormal": false}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:05.122	226030444	2026-03-11 07:02:05.122	\N
1949c021-b913-4fab-ac3d-90898ba6e63c	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773212515712.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 111, "isAbnormal": true}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:05.135	226030444	2026-03-11 07:02:05.135	\N
e32efcc4-0f3c-406a-9502-3aa23fc38e42	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.5, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 28.52, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 94.63, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 11.4, "isAbnormal": true}, "MXD": {"range": null, "value": 0.6, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 28.2, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.98, "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": 20.9, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 22.2, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 30.14, "isAbnormal": true}, "imageUrl": "/uploads/import-1773212515712.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 151, "isAbnormal": false}, "Lymphocytes": {"range": null, "value": 3.1, "isAbnormal": false}, "Neutrophils": {"range": null, "value": 96.3, "isAbnormal": false}, "MXD Absolute": {"range": null, "value": 0.13, "isAbnormal": false}, "Lymphocytes Absolute": {"range": "1-3.5", "value": 0.69, "isAbnormal": true}, "Neutrophils Absolute": {"range": "2-7", "value": 21.38, "isAbnormal": true}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:05.153	226030444	2026-03-11 07:02:05.153	\N
4359e0eb-a267-45c9-b623-f1f19ac448f0	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.8, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 28.8, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 93.8, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 12.2, "isAbnormal": true}, "MXD": {"range": null, "value": 1.8, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 28.7, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 3.06, "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": 21.4, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 31.5, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 30.7, "isAbnormal": true}, "imageUrl": "/uploads/import-1773212531015.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 180, "isAbnormal": false}, "Lymphocytes": {"range": null, "value": 1.7, "isAbnormal": false}, "Neutrophils": {"range": null, "value": 96.5, "isAbnormal": false}, "Lymphocytes (Absolute count 10^9/L)": {"range": "1-3.5", "value": 0.5, "isAbnormal": true}, "Neutrophils (Absolute count 10^9/L)": {"range": "2-7", "value": 30.4, "isAbnormal": true}}	Auto-synced from Lab Results	2009-09-16 00:00:00	2026-03-11 07:02:17.888	22603048	2026-03-11 07:02:17.888	\N
5403a373-182a-481c-9680-a0cc76a092e2	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 7.8, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 30.8, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 84.6, "isAbnormal": false}, "MXD": {"range": null, "value": 0.2, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 21.4, "isAbnormal": true}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.53, "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": 20.3, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 10.2, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 36.4, "isAbnormal": false}, "imageUrl": "/uploads/import-1773212542401.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 44, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 1.1, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 8.9, "isAbnormal": true}}	Auto-synced from Lab Results	2016-09-15 00:00:00	2026-03-11 07:02:27.562	226031122	2026-03-11 07:02:27.562	\N
8d044e78-fa6c-45b2-9191-b8d8311c1235	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.5, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.72, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 88.46, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 9.4, "isAbnormal": false}, "MXD": {"range": null, "value": 0.82, "isAbnormal": false}, "PCT": {"range": "0.2-0.36%", "value": 0.22, "isAbnormal": false}, "PCV": {"range": "40-50%", "value": 25.3, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 11.4, "isAbnormal": false}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.86, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 13.2, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 5.4, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 33.6, "isAbnormal": false}, "imageUrl": "/uploads/import-1773212551945.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 235, "isAbnormal": false}, "Lymphocytes": {"range": "1-3.5", "value": 0.67, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 3.92, "isAbnormal": false}}	Auto-synced from Lab Results	2016-09-15 00:00:00	2026-03-11 07:02:38.442	226031125	2026-03-11 07:02:38.442	\N
fd2c0625-077a-4d31-b5da-700ae17dccbc	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773216362999.pdf", "Urea, Serum": {"range": "16.6-48.2", "value": 38, "isAbnormal": false}, "Creatinine, Serum": {"range": "Male: 0.7\\n1.2\\nFemale: 0.5 - 0.9", "value": 0.41, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-11 09:24:00	2026-03-11 08:06:12.948	226031123	2026-03-11 08:06:12.948	\N
8092e2d8-1f48-4835-aec4-13ffd9184dab	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773216362999.pdf", "Sodium, Serum": {"range": "136-146", "value": 131, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 91.1, "isAbnormal": true}, "Potassium, Serum": {"range": "3.5-5", "value": 3.97, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-11 09:24:00	2026-03-11 08:06:12.978	226031123	2026-03-11 08:06:12.978	\N
bd6a6fe5-a3cb-4f57-8c3d-0f6383d5bfaa	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Serology	CRP	FINAL	{"imageUrl": "/uploads/import-1773216362999.pdf", "C-Reactive Protein, Serum": {"range": "< 6", "value": 111, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 09:24:00	2026-03-11 08:06:12.994	226031123	2026-03-11 08:06:12.994	\N
47b883a5-cf24-4bd5-8cd0-6ba0fa353138	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "13 - 17 g/dL", "value": 8.3, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.86, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 88.49, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 8.1, "isAbnormal": false}, "MXD": {"range": null, "value": 1.24, "isAbnormal": false}, "PCT": {"range": "0.2 - 0.36%", "value": 0.44, "isAbnormal": true}, "PCV": {"range": "40-50%", "value": 24.6, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 9.1, "isAbnormal": false}, "RBC": {"range": "4.5-5.5 10^12 /L", "value": 2.78, "isAbnormal": true}, "RDW": {"range": "11.6 -14%", "value": 13.2, "isAbnormal": false}, "WBC": {"range": "4-11 10^9/L", "value": 8.6, "isAbnormal": false}, "MCHC": {"range": "31 - 37 g/dL", "value": 33.74, "isAbnormal": false}, "imageUrl": "/uploads/import-1773216362999.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 548, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 1.3, "isAbnormal": false}, "Neutrophils": {"range": "2-7", "value": 6.06, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-11 09:24:00	2026-03-11 08:06:13.004	226031123	2026-03-11 08:06:13.004	\N
dc61473e-9aa1-4ab6-8246-e159e451f937	949d4d05-0ff6-4f4d-824f-33b2b25fa073	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773216376606.pdf", "Sodium, Serum": {"range": "136-146", "value": 133, "isAbnormal": true}, "Chloride, Serum": {"range": "96-106", "value": 97.6, "isAbnormal": false}, "Potassium, Serum": {"range": "3.5-5", "value": 3.89, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-10 11:55:00	2026-03-11 08:06:19.831	226031058	2026-03-11 08:06:19.831	\N
390d37d4-5e2c-49f6-8733-5f468356814e	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Albumin, D-Dimer, Procalcitonin	FINAL	{"imageUrl": "/uploads/import-1773265043120.pdf", "Albumin, Serum": {"range": "3.5-5.2", "value": 2.78, "isAbnormal": true}, "D-Dimer, Plasma": {"range": "< 500", "value": "> 10719", "isAbnormal": true}, "Procalcitonin, Serum": {"range": "Normal: 0.0 - 0.5\\nMild: 0.5- 2.0\\nModerate: 2.0 -10.0\\nSevere: > 10", "value": 39.2, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 23:26:00	2026-03-11 21:37:32.801	2260311252	2026-03-11 21:37:32.801	\N
2df31b34-1462-4591-8579-cb588e58a1ec	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "12 - 15 g/dL", "value": 8.7, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.59, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 82.31, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 12.1, "isAbnormal": true}, "MXD": {"range": null, "value": 0.63, "isAbnormal": false}, "PCT": {"range": "0.2-0.36%", "value": 0.05, "isAbnormal": true}, "PCV": {"range": "36-46%", "value": 24.2, "isAbnormal": true}, "PDW": {"range": "9-17%", "value": 20.1, "isAbnormal": true}, "RBC": {"range": "3.8-4.8 10^12 /L", "value": 2.94, "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": 14.9, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 13.3, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 35.95, "isAbnormal": false}, "imageUrl": "/uploads/import-1773265043120.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 43, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 0.6, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 12.08, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 23:26:00	2026-03-11 21:37:32.839	2260311252	2026-03-11 21:37:32.839	\N
95515ecc-83c4-4621-904f-2c474a49d576	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/import-1773265056808.pdf", "Urea, Serum": {"range": "16.6 - 48.2", "value": 49, "isAbnormal": true}, "Creatinine, Serum": {"range": "Female: 0.5 - 0.9", "value": 1.19, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 21:36:00	2026-03-11 21:37:47.597	2260311232	2026-03-11 21:37:47.597	\N
16f0658e-8902-4bc6-9b34-e712f3fd562e	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/import-1773265056808.pdf", "Sodium, Serum": {"range": "136-146", "value": 142.1, "isAbnormal": false}, "Chloride, Serum": {"range": "96-106", "value": 109.6, "isAbnormal": true}, "Potassium, Serum": {"range": "3.5-5", "value": 3.07, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 21:36:00	2026-03-11 21:37:47.617	2260311232	2026-03-11 21:37:47.617	\N
50de63d5-9c90-4ce7-ba64-fb9df5c8a44c	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Coagulation	Coagulation	FINAL	{"INR": {"range": "Normal: 1- 1.15\\nTherapeutic: 2 - 3", "value": 1.67, "isAbnormal": true}, "PTT": {"range": "26-40", "value": 52.93, "isAbnormal": true}, "imageUrl": "/uploads/import-1773265056808.pdf", "Fibrinogen": {"range": "180-360", "value": 132.31, "isAbnormal": true}, "Prothrombin Time": {"range": "11-16", "value": 23.15, "isAbnormal": true}, "Normal Control Plasma": {"range": null, "value": 14.3, "isAbnormal": false}}	Auto-synced from Lab Results	2026-03-11 21:36:00	2026-03-11 21:37:47.626	2260311232	2026-03-11 21:37:47.626	\N
f9b03d19-5520-44e3-bc72-98bd8d4b09b1	a5c4839d-c071-4c89-a204-b390ad8e8af4	\N	a2497fb8-1acf-44d4-a3bf-9289be25efe9	LAB	Hematology	CBC	FINAL	{"Hb": {"range": "12 - 15 g/dL", "value": 8, "isAbnormal": true}, "MCH": {"range": "27 - 32 pg", "value": 29.63, "isAbnormal": false}, "MCV": {"range": "80 - 100 fl", "value": 82.59, "isAbnormal": false}, "MPV": {"range": "7.8 - 11 fl", "value": 12.1, "isAbnormal": true}, "MXD": {"range": null, "value": 0.08, "isAbnormal": false}, "PCT": {"range": "0.2-0.36%", "value": 0.05, "isAbnormal": true}, "PCV": {"range": "36-46%", "value": 22.3, "isAbnormal": true}, "PDW": {"range": "9 - 17%", "value": 18.5, "isAbnormal": true}, "RBC": {"range": "3.8-4.8 10^12 /L", "value": 2.7, "isAbnormal": true}, "RDW": {"range": "11.6 - 14%", "value": 14.6, "isAbnormal": true}, "WBC": {"range": "4-11 10^9/L", "value": 11.7, "isAbnormal": true}, "MCHC": {"range": "31 - 37 g/dL", "value": 35.87, "isAbnormal": false}, "imageUrl": "/uploads/import-1773265056808.pdf", "Platelets": {"range": "150-450 10^9/L", "value": 43, "isAbnormal": true}, "Lymphocytes": {"range": "1-3.5", "value": 0.29, "isAbnormal": true}, "Neutrophils": {"range": "2-7", "value": 11.33, "isAbnormal": true}}	Auto-synced from Lab Results	2026-03-11 21:36:00	2026-03-11 21:37:47.641	2260311232	2026-03-11 21:37:47.641	\N
8b218103-285b-438e-9c56-c8acc8625827	c545e12f-9e2d-485c-90f4-43a2b7203391	\N	mock-senior-id	LAB	Serology	Blood Compatibility Test	FINAL	{"imageUrl": "", "Donor name": {"range": null, "value": ".", "isAbnormal": false}, "Blood pint ID": {"range": null, "value": "7202", "isAbnormal": false}, "Antiglobulin Crossmatch": {"range": null, "value": "Compatible", "isAbnormal": false}, "Immediate Spin Crossmatch": {"range": null, "value": "Compatible", "isAbnormal": false}, "Donor Blood Group (ABO & Rh)": {"range": null, "value": "O Rh D Positive (O+)", "isAbnormal": false}, "Recipient Blood Group (ABO & Rh)": {"range": null, "value": "O Rh D Positive (O +)", "isAbnormal": false}}	Imported from Lab Results	2026-03-12 03:19:00	2026-03-12 10:34:17.526	\N	2026-03-12 10:34:17.526	\N
\.


--
-- Data for Name: Medication; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Medication" (id, name, "defaultDose", route, frequency, "infusionRate", "otherInstructions", "isActive", "patientId", "startedAt", dilution, "updatedAt", "durationReminder", "discontinuedAt") FROM stdin;
0bf770fe-df52-409c-9d39-24c914cfee63	Paracetamol	1g	PO	Q6H	\N	\N	t	4f8820ab-0ca8-4844-9f44-51a795c334ae	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
8516b6b1-7188-4fa2-90fd-bee173714fb3	Ceftriaxone	2g	IV	OD	\N	\N	t	4f8820ab-0ca8-4844-9f44-51a795c334ae	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Furosemide	40mg	IV	BD	\N	\N	t	4f8820ab-0ca8-4844-9f44-51a795c334ae	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
618650f7-19c4-4896-bf5c-b22d15bed3c7	sevelamer	800	PO	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
04cc58e8-dc20-4687-a803-939175a40747	alpha one 	20	PO	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
5cc824b6-cbb5-4bb9-b895-4a73f7337caa	keppra vial	500	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
8f9bc1b1-bcc6-4cac-837a-be67c4af6608	ca carbonate	500	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
71cabdcc-c386-417b-a22d-d5c5cabbfcfd	tegretol tab 	200	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
63b5545b-fb41-423e-9278-228347b0ca98	GS + NS	80	IV	OD (Once Daily)	80		t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
25a9dfb2-5b94-41d7-9789-03e2ebba28fa	Paracetamol	1 g	IV	TDS (Thrice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
8eaef7b6-d28f-4c28-8243-1b203403a86d	Pantoprazole	40 mg	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
fb76b828-2157-4deb-ad5c-998a929bdd4a	Albumin 20%	20%	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
bde673ee-cf6a-48be-80e0-6d42fd3b2010	L - Carintine 	3cc	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
f6823bd8-55b4-461e-ac0c-a6310c7d96e0	Caspofungin	50	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
30130a49-2715-4eff-af11-fdb452d9ade0	Vancomycin	1 g	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
496ac8a8-a1d9-4723-b837-fe68c3c6fdf9	Ciprofloxacine	200	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
f6580996-85a5-4903-a0c2-8d58d08089cc	Ipratropium Bromide 	neb	NEB	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
8f44f3ad-eaa9-4312-adf8-a98ad4d631e3	NACl 3%	Neb	NEB	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
d933a885-f9f3-4a0c-b85d-ff4de2f32e31	Eye drop	lub	NEB	6x/Day (Q4H)		قطرات عين ترطيب	t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
e815b46a-a6d9-4e54-88c7-8db86d6bb3e6	Solvodin	amp	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:12.333	\N	2026-03-09 18:28:23.517	\N	\N
f3f10783-ba2b-46df-9cee-82600cb4caf0	fusidine 	oint	IV	6x/Day (Q4H)		تدهن اليدين باستمرار كلما جفت	t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:40.141	\N	2026-03-09 18:28:23.517	\N	\N
609d42e4-28fe-41e9-8b8a-6661bee1544e	Assist 	Neb	NEB	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 19:00:12.14	\N	2026-03-09 18:28:23.517	\N	\N
84c649a6-17b7-4bd7-90f8-7c4b6d43e85f	Hydrocortisone	100 mg	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 19:00:27.812	\N	2026-03-09 18:28:23.517	\N	\N
0b2e0767-0143-4f05-a168-91141ec4bb18	Meropenem	1 g	IV	BD (Twice Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 19:00:40.139	\N	2026-03-09 18:28:23.517	\N	\N
6da92a5e-4c2a-421a-9179-2878a7a0959d	lasix 	10mg/hr	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 19:01:15.027	\N	2026-03-09 18:28:23.517	\N	\N
2664dcc9-d3c1-47be-a42e-b0064a01fb9a	B-Core	2.5	IV	BD (Twice Daily)			f	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-02-24 18:59:08.248	\N	2026-03-09 18:28:23.517	\N	\N
e2212668-1118-4031-8b4e-e68e13ba39be	Norepinephrine	0.05 mcg/kg/min	IV	OD (Once Daily)			t	68baae90-91be-4b76-9d3b-7e5e423a0523	2026-03-08 00:00:00	\N	2026-03-09 18:28:23.517	\N	\N
de299632-6717-4ebf-bedc-7142ca8a524a	Propofol	10 mg/ml	IV	OD (Once Daily)			t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 18:28:23.517	\N	\N
4d630e11-bd07-4d11-b11a-87f9b341e515	Norepinephrine	0.05 mcg/kg/min	IV	OD (Once Daily)	5		t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	50	2026-03-09 19:00:24.502	\N	\N
81040837-a6a7-4424-97a2-bf1c3d5269a3	Adrenaline	1 mg	IV	OD (Once Daily)	2		t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 19:00:54.404	\N	\N
1c66317c-5224-447c-b97c-71f243d2e7b8	dobutamine	5	IV	OD (Once Daily)	4		f	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 19:01:24.512	\N	\N
6e848581-318e-4e0f-bbcc-7dd1f03831cb	dobutamine	3	IV	OD (Once Daily)			t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 19:03:31.898	\N	\N
71073bdb-7c98-4c76-9156-60c701886971	GS	80	IV	OD (Once Daily)			t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 19:05:06.768	\N	\N
0349f9f7-56bb-4daf-abef-86d06ac1ac55	NS	40	IV	OD (Once Daily)	50		t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 19:05:29.21	\N	\N
d8c1726e-9c7e-4399-bf6f-a6b47bcba2cb	Lopremide	2 tab	PO	OD (Once Daily)			t	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	2026-03-09 00:00:00	\N	2026-03-09 20:47:08.783	7	\N
301f1df1-47a4-4a77-a796-29db344ef2fb	Lopremide	2 tab	PO	Once Only			f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	2026-03-09 00:00:00	\N	2026-03-09 22:22:21.511	\N	2026-03-09 22:22:21.51
\.


--
-- Data for Name: MedicationAdministration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MedicationAdministration" (id, "patientId", "medicationId", status, dose, "timestamp", "userId", dilution) FROM stdin;
795395a7-0097-4f09-9c47-7650d4b1e9b7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 11:00:51.913	mock-nurse-id	\N
d0ee82dc-fb77-4907-a8b5-4edbcccd6bb2	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 17:00:51.913	mock-nurse-id	\N
61875330-2e4a-4ba3-b98f-c833dc5260d3	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 23:00:51.913	mock-nurse-id	\N
3ebed734-e91e-4cd3-a0f8-d606e4d132a7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 05:00:51.913	mock-nurse-id	\N
7c2af7ef-e464-4258-a69f-6648deb8c633	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 11:00:51.913	mock-nurse-id	\N
e5b755d3-723d-453a-ba6e-1ef35263709f	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 17:00:51.913	mock-nurse-id	\N
eec558c5-8709-4101-82d2-29c3bc933aa7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 23:00:51.913	mock-nurse-id	\N
b9c57a35-561d-44dc-ab25-c0dff97504fc	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-19 05:00:51.913	mock-nurse-id	\N
1324b049-4914-43b7-9041-b2f13eebb43d	4f8820ab-0ca8-4844-9f44-51a795c334ae	8516b6b1-7188-4fa2-90fd-bee173714fb3	Given	2g	2026-02-17 12:00:51.913	mock-nurse-id	\N
87e941c5-7399-4100-9d1a-340c8c96d2e7	4f8820ab-0ca8-4844-9f44-51a795c334ae	8516b6b1-7188-4fa2-90fd-bee173714fb3	Given	2g	2026-02-18 12:00:51.913	mock-nurse-id	\N
28281ef8-de76-442d-8d77-29d7fa1d6955	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-17 13:00:51.913	mock-nurse-id	\N
73e28902-c500-4ab4-af3a-aa56aa5515cb	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-18 01:00:51.913	mock-nurse-id	\N
b0036c56-54f3-47dc-a84a-4f6f033cc2df	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-18 13:00:51.913	mock-nurse-id	\N
54f2b689-129a-4f52-a28f-238de3b75cc5	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-19 01:00:51.913	mock-nurse-id	\N
c180b516-5e49-47a7-a29e-457856a1a484	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-02-25 23:28:45.298	mock-senior-id	\N
23c60314-45f0-43d8-8cdb-6381df93f756	68baae90-91be-4b76-9d3b-7e5e423a0523	04cc58e8-dc20-4687-a803-939175a40747	Given	20	2026-02-25 23:29:32.265	mock-nurse-id	\N
81540f6b-3d70-4803-a6d8-b8fe33fb36ea	68baae90-91be-4b76-9d3b-7e5e423a0523	5cc824b6-cbb5-4bb9-b895-4a73f7337caa	Given	500	2026-02-25 23:29:33.605	mock-nurse-id	\N
a2d19308-9e30-474b-8dcc-50040a2e9e54	68baae90-91be-4b76-9d3b-7e5e423a0523	8f9bc1b1-bcc6-4cac-837a-be67c4af6608	Given	500	2026-02-25 23:29:34.934	mock-nurse-id	\N
693ffa12-6008-4099-a70b-444631ef92b4	68baae90-91be-4b76-9d3b-7e5e423a0523	71cabdcc-c386-417b-a22d-d5c5cabbfcfd	Given	200	2026-02-25 23:29:35.952	mock-nurse-id	\N
b056542f-93d8-4a55-b1d0-36258274cf1f	68baae90-91be-4b76-9d3b-7e5e423a0523	63b5545b-fb41-423e-9278-228347b0ca98	Given	80	2026-02-25 23:29:37.619	mock-nurse-id	\N
e919caf4-4d84-4b3a-8546-ca26e24d9c2b	68baae90-91be-4b76-9d3b-7e5e423a0523	25a9dfb2-5b94-41d7-9789-03e2ebba28fa	Given	1 g	2026-02-25 23:29:38.501	mock-nurse-id	\N
56cc04ab-5764-4d6d-b8f6-fd0a7fbad2e5	68baae90-91be-4b76-9d3b-7e5e423a0523	8eaef7b6-d28f-4c28-8243-1b203403a86d	Given	40 mg	2026-02-25 23:29:40.161	mock-nurse-id	\N
e437b3bd-12c4-410d-a8e9-4e6dfa56ebac	68baae90-91be-4b76-9d3b-7e5e423a0523	fb76b828-2157-4deb-ad5c-998a929bdd4a	Given	20%	2026-02-25 23:29:41.447	mock-nurse-id	\N
d0b187b1-b391-499c-b416-0b888375672a	68baae90-91be-4b76-9d3b-7e5e423a0523	bde673ee-cf6a-48be-80e0-6d42fd3b2010	Given	3cc	2026-02-25 23:29:42.328	mock-nurse-id	\N
2fa93872-4178-4744-b34c-8e7cc9e964e2	68baae90-91be-4b76-9d3b-7e5e423a0523	f6823bd8-55b4-461e-ac0c-a6310c7d96e0	Given	50	2026-02-25 23:29:43.397	mock-nurse-id	\N
0ec677d8-b55f-4c75-aa0c-b3e0d25a1b43	68baae90-91be-4b76-9d3b-7e5e423a0523	30130a49-2715-4eff-af11-fdb452d9ade0	Given	1 g	2026-02-25 23:29:45.209	mock-nurse-id	\N
47a61b55-8a9b-4730-98ab-d8f92ad9166d	68baae90-91be-4b76-9d3b-7e5e423a0523	496ac8a8-a1d9-4723-b837-fe68c3c6fdf9	Given	200	2026-02-25 23:29:46.553	mock-nurse-id	\N
c53d9f86-6e62-40cd-b068-3958458e6d9f	68baae90-91be-4b76-9d3b-7e5e423a0523	f6580996-85a5-4903-a0c2-8d58d08089cc	Given	neb	2026-02-25 23:29:48.389	mock-nurse-id	\N
0ffd7044-bda2-47c9-bc0d-d61d89978489	68baae90-91be-4b76-9d3b-7e5e423a0523	8f44f3ad-eaa9-4312-adf8-a98ad4d631e3	Given	Neb	2026-02-25 23:29:50.287	mock-nurse-id	\N
40d716ab-22a2-46aa-b3b5-8da1463bb544	68baae90-91be-4b76-9d3b-7e5e423a0523	d933a885-f9f3-4a0c-b85d-ff4de2f32e31	Given	lub	2026-02-25 23:29:51.768	mock-nurse-id	\N
9d82fcc6-e399-4b8b-98ea-047a88eb2434	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-02-25 23:30:18.183	mock-nurse-id	\N
a128a450-3231-4100-b393-c0cb921b7f16	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-02-25 23:30:18.997	mock-nurse-id	\N
b0c8a55c-85b5-4f5f-a1d8-4e800ca38845	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-02-25 23:30:19.77	mock-nurse-id	\N
fe1c8aa4-d45d-4464-8961-95a79f2a7f47	68baae90-91be-4b76-9d3b-7e5e423a0523	04cc58e8-dc20-4687-a803-939175a40747	Given	20	2026-02-25 23:30:20.718	mock-nurse-id	\N
52ae2830-703c-4be4-a6f8-b4cda3080516	68baae90-91be-4b76-9d3b-7e5e423a0523	5cc824b6-cbb5-4bb9-b895-4a73f7337caa	Given	500	2026-02-25 23:30:22.672	mock-nurse-id	\N
254eba45-66ef-490b-9e41-fb12f7152b35	68baae90-91be-4b76-9d3b-7e5e423a0523	5cc824b6-cbb5-4bb9-b895-4a73f7337caa	Given	500	2026-02-25 23:30:23.528	mock-nurse-id	\N
afce01d6-b1cc-4a25-8f92-282fc580bf36	68baae90-91be-4b76-9d3b-7e5e423a0523	71cabdcc-c386-417b-a22d-d5c5cabbfcfd	Given	200	2026-02-25 23:30:24.992	mock-nurse-id	\N
988653cc-4f2c-4eb7-8f03-bc4c14e90d8b	68baae90-91be-4b76-9d3b-7e5e423a0523	71cabdcc-c386-417b-a22d-d5c5cabbfcfd	Given	200	2026-02-25 23:30:25.748	mock-nurse-id	\N
80ffa7f2-7692-4619-9edf-933a34d1cac7	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-03-07 20:37:30.92	2806f3c1-e62a-468a-be59-838db585a8f9	\N
694891cf-3965-4e71-8e4e-c2fab4748b25	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-03-07 20:37:31.942	2806f3c1-e62a-468a-be59-838db585a8f9	\N
b0f3932d-fe8f-4b09-a15c-b5f4066162d3	68baae90-91be-4b76-9d3b-7e5e423a0523	04cc58e8-dc20-4687-a803-939175a40747	Given	20	2026-03-07 20:37:32.039	2806f3c1-e62a-468a-be59-838db585a8f9	\N
d535aff5-5971-492a-b8d0-eec6a3261080	68baae90-91be-4b76-9d3b-7e5e423a0523	5cc824b6-cbb5-4bb9-b895-4a73f7337caa	Given	500	2026-03-07 20:37:33.094	2806f3c1-e62a-468a-be59-838db585a8f9	\N
f0c1cde5-aafb-474a-a5ec-af6210b6872e	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-03-07 20:37:34.359	2806f3c1-e62a-468a-be59-838db585a8f9	\N
218d1e78-e889-49a2-9870-7a81df54c84e	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-03-07 20:37:34.908	2806f3c1-e62a-468a-be59-838db585a8f9	\N
703ca9d3-dce4-44cd-a33a-c5107c03b773	68baae90-91be-4b76-9d3b-7e5e423a0523	618650f7-19c4-4896-bf5c-b22d15bed3c7	Given	800	2026-03-08 09:38:03.298	mock-senior-id	\N
9fb61fe4-77ac-444a-bc1a-5e6bd2b91a0f	68baae90-91be-4b76-9d3b-7e5e423a0523	8f9bc1b1-bcc6-4cac-837a-be67c4af6608	Given	500	2026-03-09 10:06:06.48	5a476d92-d719-4322-a10f-b6f747686e00	\N
d7a5c7dc-f32c-47d6-8b37-b0eb3d9d887a	68baae90-91be-4b76-9d3b-7e5e423a0523	71cabdcc-c386-417b-a22d-d5c5cabbfcfd	Given	200	2026-03-09 10:06:08.815	5a476d92-d719-4322-a10f-b6f747686e00	\N
af52b45c-9c02-48d1-a3cf-583cef23c7dd	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	de299632-6717-4ebf-bedc-7142ca8a524a	Given	10 mg/ml	2026-03-09 13:05:26.326	5a476d92-d719-4322-a10f-b6f747686e00	\N
43b409bf-f6ed-4278-be0f-5ccbac9991f3	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	de299632-6717-4ebf-bedc-7142ca8a524a	Given	10 mg/ml	2026-03-09 17:45:03.794	5a476d92-d719-4322-a10f-b6f747686e00	\N
da6c2dd3-c49b-4212-8cbd-2418c452fd5a	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	de299632-6717-4ebf-bedc-7142ca8a524a	Given	10 mg/ml	2026-03-09 21:28:36.938	5a476d92-d719-4322-a10f-b6f747686e00	30
995d2340-c00d-4bc2-a9dc-ae9694ab207a	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	301f1df1-47a4-4a77-a796-29db344ef2fb	Given	2 tab	2026-03-09 22:22:21.502	mock-senior-id	\N
\.


--
-- Data for Name: NurseCheckIn; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NurseCheckIn" (id, "patientId", "userId", "shiftId", "airwaySafe", "breathingOk", "circulationOk", notes, "timestamp") FROM stdin;
acaf2926-6eec-4b65-90bc-4e79bc5a5f63	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-nurse-id	393dc091-8f77-48c4-8592-66d6dfe727f6	t	t	t		2026-02-19 09:32:11.957
7810206e-ef15-4e63-ba8a-3bfd2f171d40	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	b32d96ad-009e-4a6f-8eb9-f8bb36f08040	t	t	t		2026-03-09 12:27:22.958
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Patient" (id, mrn, name, dob, gender, comorbidities, diagnosis, "createdAt", "updatedAt") FROM stdin;
ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	316506-3	مينا مسافر علي حسين	2021-02-18 19:00:07.875	Female	{DM}	DKA with Complication	2026-02-18 19:00:07.882	2026-02-18 19:00:07.882
f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	323699-3	عبود هلال حمدي سليمان	1950-02-19 09:26:16.166	Male	{"HTN BPH"}	Stroke	2026-02-19 09:26:16.173	2026-02-19 09:26:16.173
4f8820ab-0ca8-4844-9f44-51a795c334ae	324142-3	زبيدة حسين	1980-01-01 00:00:00	Male	{"HTN DM"}	ACDF tumor	2026-02-19 11:00:51.777	2026-02-24 16:49:38.53
b97ca87a-eebf-436f-ab50-9477234dfaad	311903-3	احمد عبداللطيف سوعان	1971-02-24 16:50:58.915	Male	{HTN}	berry aneurysm rupture	2026-02-24 16:50:58.921	2026-02-24 16:50:58.921
68baae90-91be-4b76-9d3b-7e5e423a0523	322637-3	طلال مال الله رشيد خورشيد	1951-02-24 17:43:32.702	Male	{HTN,CKD}	ICH	2026-02-24 17:43:32.707	2026-02-24 17:45:47.673
38b62b34-4f1f-496f-974c-fb8fc34d934b	102873-0	حكمت عبدالرزاق عبدالله سليم	1954-02-18 18:32:45.672	Male	{NONE}	RTA	2026-02-18 18:32:45.689	2026-03-03 13:49:06.808
8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	325400-3	هاشم ياسين خليل يونس	1977-02-26 08:54:43.149	Male	{DM1,"Renal Transplant"}	ICH	2026-02-26 08:54:42.952	2026-03-03 13:49:29.781
0ebf79aa-cc02-474f-9680-a5833144423f	12345	Test Patient	1986-03-03 20:14:03.551	Male	{}	Test Diagnosis	2026-03-03 20:14:03.785	2026-03-03 20:14:03.785
9521ed83-9eb9-468a-ab99-99d4378cc7f2	32323	test2	1993-03-09 21:58:42.96	Male	{ht,dm,cva}	stroke	2026-03-09 21:58:43.461	2026-03-09 21:58:43.461
6ff9b393-f837-498d-80f4-5ec64bfaa1e1	sss	هاشم ياسين خليل يونس	2004-03-09 22:12:06.902	Male	{js}	sjs	2026-03-09 22:12:07.941	2026-03-09 22:12:07.941
949d4d05-0ff6-4f4d-824f-33b2b25fa073	326146-3	نوري فيصل حما قاسكي	1968-02-26 09:28:51.463	Male	{}	RTA	2026-02-26 09:28:52.899	2026-03-10 13:30:37.656
a5c4839d-c071-4c89-a204-b390ad8e8af4	3434	يثرب سعد حمودي	1996-03-11 12:21:26.503	Female	{}	OHSS	2026-03-11 12:21:28.486	2026-03-11 19:52:38.661
c545e12f-9e2d-485c-90f4-43a2b7203391	62626	علي عبدالله	1952-03-12 08:37:01.711	Male	{HT,HF}	Pneumoniae 	2026-03-12 08:37:02.317	2026-03-12 08:37:02.317
\.


--
-- Data for Name: PatientAssignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PatientAssignment" (id, "patientId", "userId", "shiftId", "isActive", "createdAt", "endedAt", "isPending") FROM stdin;
ed54eb59-0865-481b-8900-54af0fab33f3	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 17:56:06.164	2026-03-09 17:56:13.023	f
cc8f8112-fa50-44a6-a24c-d2b63853cfd0	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 17:56:16.21	\N	f
8e56db85-45eb-41e9-8daa-6c17630c9778	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 20:49:15.561	2026-03-09 20:49:17.517	f
70aead91-d1bd-48e5-b0c0-19e4a971acac	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 20:49:32	\N	f
abebb626-8267-4b7e-ba0d-cecaae7a3d36	38b62b34-4f1f-496f-974c-fb8fc34d934b	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 21:17:03.423	2026-03-09 21:26:31.043	f
9ef2f757-4c50-49cf-9369-e40971e35047	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 21:27:50.027	2026-03-09 22:00:17.41	f
b9a253b2-6682-40be-b5b3-e2e0c6dc9969	9521ed83-9eb9-468a-ab99-99d4378cc7f2	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:00:53.724	\N	f
3bf4f9c4-a224-49a5-ab27-b0e4b15bcb12	0ebf79aa-cc02-474f-9680-a5833144423f	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:02:28.63	\N	f
4faa96ac-3ddf-4e5b-85ba-4ad14c573f08	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:07:01.151	2026-03-09 22:08:06.343	f
30905bc9-a098-4134-a279-916ab669331a	0ebf79aa-cc02-474f-9680-a5833144423f	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:08:09.151	\N	f
b033e513-f701-477a-833b-fc556f39ccdb	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:21:19.148	2026-03-09 22:21:23.832	f
84e08dd0-777e-4863-a908-e4af00485f05	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:21:33.975	2026-03-09 22:35:28.263	f
31be3f14-9f13-4c42-812a-3646f350ec61	38b62b34-4f1f-496f-974c-fb8fc34d934b	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 22:35:30.735	2026-03-10 08:31:05.49	f
27dd2f83-75b6-472a-8dcb-c21731d0ccae	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-10 08:31:26.683	2026-03-10 15:00:03.888	f
cb9758c1-3b2f-4612-95b8-643451d21cb0	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-10 15:00:11.532	2026-03-10 22:37:07.763	f
791c2927-114c-416f-9ec7-8dc57186d743	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	5a476d92-d719-4322-a10f-b6f747686e00	\N	f	2026-03-09 09:57:23.936	2026-03-09 17:56:01.094	f
8aeff27f-deef-4667-88b0-cfc19454e9f6	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-10 22:37:13.375	2026-03-11 08:06:31.394	f
adff57b8-3d76-4e8e-8179-36c4f0037503	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-10 22:36:31.242	2026-03-11 08:06:31.394	f
311dbad4-af42-4094-a751-70b4561a97f4	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-11 08:06:41.795	2026-03-11 08:06:47.406	f
208dbf2f-fe2c-4342-80ba-7822e4f3e0ea	b97ca87a-eebf-436f-ab50-9477234dfaad	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-11 08:06:57.899	\N	f
16b930f1-1570-4765-9837-1d30caacec19	a5c4839d-c071-4c89-a204-b390ad8e8af4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-12 00:41:27.248	\N	f
77432afa-89f0-4323-8ebc-ec3b2a1f4926	a5c4839d-c071-4c89-a204-b390ad8e8af4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-12 01:21:57.654	\N	f
1f81b6ab-ae22-43e6-b72b-ee5415fac868	a5c4839d-c071-4c89-a204-b390ad8e8af4	a587c936-2807-4a41-8fd3-51a9e98696e2	\N	f	2026-03-12 09:46:05.615	\N	f
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Shift" (id, "userId", type, "startTime", "endTime", "isActive") FROM stdin;
c2280ad8-fc45-4692-89f7-e269d7aff3d5	mock-nurse-id	DAY	2026-02-18 18:18:35.135	2026-02-19 08:49:57.055	f
393dc091-8f77-48c4-8592-66d6dfe727f6	mock-nurse-id	DAY	2026-02-19 09:31:11.761	2026-02-19 09:52:44.662	f
e1d4e2a1-cbea-43bf-a079-eee60eea017e	mock-nurse-id	DAY	2026-02-19 11:51:32.239	2026-02-24 15:05:27.535	f
ae6e3f99-0ef7-409e-896d-81bc34900874	mock-senior-id	NIGHT	2026-02-18 18:19:04.679	2026-02-26 11:58:35.473	f
06e7c56e-58dd-4d55-b5a5-12d7c166d62e	mock-nurse-id	DAY	2026-02-24 15:05:32.925	2026-02-26 11:58:35.473	f
874117aa-b8fd-4744-8750-972184585646	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	DAY	2026-02-24 16:31:50.944	2026-02-26 11:58:35.473	f
53fad07a-9f4b-4e42-860f-ce59dac06462	a587c936-2807-4a41-8fd3-51a9e98696e2	NIGHT	2026-03-12 00:41:43.796	2026-03-12 01:21:43.799	f
af4bec25-f523-4cab-a228-32a6490ca5fc	mock-senior-id	DAY	2026-02-26 12:01:03.81	2026-03-03 20:02:42.094	f
6bf87508-bdec-4f46-b67d-2152c092b38e	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 09:57:32.815	2026-03-09 10:07:39.946	f
c946ba3c-7001-484b-b5a1-639a3138ee07	mock-senior-id	NIGHT	2026-03-03 20:02:46.779	2026-03-09 20:29:22.008	f
b32d96ad-009e-4a6f-8eb9-f8bb36f08040	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 10:09:42.902	2026-03-09 20:29:22.008	f
50081b66-9046-424c-8d3a-74d0b62b0f39	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 20:49:25.456	2026-03-09 21:04:21.262	f
1fc5ce5b-746e-4754-b183-307e77cbeae5	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 21:16:59.863	2026-03-09 21:59:36.408	f
4313b2e1-c2f1-4746-8f40-7628b1ad2469	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 21:59:50.605	2026-03-09 22:00:08.658	f
3337fdde-d1d1-4840-bba1-ebf0d3882b8e	5a476d92-d719-4322-a10f-b6f747686e00	NIGHT	2026-03-09 22:00:10.847	2026-03-09 22:02:04.725	f
df307bb5-6c66-4e38-a7aa-b824ab439cdc	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 22:02:25.461	2026-03-09 22:06:44.155	f
a5e46978-78ae-481d-888d-df53ae11c1ae	mock-senior-id	DAY	2026-03-09 22:04:34.627	2026-03-09 22:06:44.155	f
df3dd0e0-b049-47d0-8fd2-2f268b7e97d4	5a476d92-d719-4322-a10f-b6f747686e00	NIGHT	2026-03-09 22:06:58.688	2026-03-09 22:10:44.294	f
30f33b49-abf2-4588-92d1-93ae916544a0	mock-senior-id	DAY	2026-03-09 22:10:58.394	2026-03-09 22:21:11.167	f
228fb3d9-1e04-44d5-a713-2c485e2680f4	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-09 22:21:15.955	2026-03-09 22:21:24.006	f
b57a91a3-aa64-4ecd-ad8d-ea775cc6934c	5a476d92-d719-4322-a10f-b6f747686e00	NIGHT	2026-03-09 22:21:31.598	2026-03-09 22:21:57.179	f
abeea946-cdfb-4b0e-b158-11cd3a6383ab	5a476d92-d719-4322-a10f-b6f747686e00	NIGHT	2026-03-09 22:35:19.788	2026-03-09 22:35:36.834	f
15e66f79-1799-4a21-a015-3ae57a517981	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-10 08:13:47.182	2026-03-10 08:31:05.987	f
bfa222c3-9f89-4b8e-877b-8cb727f17c07	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-10 08:31:22.163	2026-03-10 13:48:53.214	f
f736480f-51a2-4a9b-ab6e-2954312fddcf	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-10 14:59:20.317	2026-03-10 15:00:04.209	f
1a29af3f-8fe0-4fda-a4d2-35f1784ea114	5a476d92-d719-4322-a10f-b6f747686e00	DAY	2026-03-10 15:00:09.626	2026-03-10 22:37:07.927	f
05c97c27-7a4c-49c5-bc54-c35a79478078	a587c936-2807-4a41-8fd3-51a9e98696e2	NIGHT	2026-03-10 22:36:28.698	2026-03-11 08:06:31.729	f
0fd8c945-a5d1-4947-8042-9549bbd01d0e	a587c936-2807-4a41-8fd3-51a9e98696e2	DAY	2026-03-11 08:06:39.723	2026-03-11 08:06:47.699	f
19d46ced-3d44-4e98-b259-280d0a214d33	a587c936-2807-4a41-8fd3-51a9e98696e2	DAY	2026-03-11 08:06:56.036	2026-03-11 08:07:29.409	f
565c722b-b10c-4ee9-834f-7f67a3a8a57d	5a476d92-d719-4322-a10f-b6f747686e00	NIGHT	2026-03-11 01:15:33.331	2026-03-11 08:09:33.344	f
67c97ae1-ab90-41c2-a099-5b7d12693cb2	mock-senior-id	DAY	2026-03-12 00:41:00.304	2026-03-12 00:41:14.601	f
38b2c312-34f7-4869-8194-857fd9ad7736	a587c936-2807-4a41-8fd3-51a9e98696e2	NIGHT	2026-03-12 00:41:23.819	2026-03-12 00:41:35.063	f
b34c2d26-75ba-43ce-b386-cbe2f99a5d4c	a587c936-2807-4a41-8fd3-51a9e98696e2	NIGHT	2026-03-12 01:21:53.518	2026-03-12 01:22:01.668	f
b9510e22-24ce-49a7-b82f-e13aea3cc4ba	a587c936-2807-4a41-8fd3-51a9e98696e2	NIGHT	2026-03-12 01:22:10.376	2026-03-12 09:46:13.836	f
\.


--
-- Data for Name: SkinAssessment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SkinAssessment" (id, "patientId", "authorId", "bodyPart", view, type, "imageUrl", notes, "timestamp") FROM stdin;
\.


--
-- Data for Name: SpecialistNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SpecialistNote" (id, "patientId", "authorId", date, "shiftType", "apacheScore", "histHT", "histDM", "histAsthma", "histCOPD", "histIHD", "histStroke", "histOther", "neuroGCS", "neuroRASS", "respChest", "respRoomAir", "respO2Therapy", "respVentMode", "respVentModeText", "respFio2", "respPS", "intCVLine", "intArtLine", "intETT", "intTrach", "intDoubleLumen", "hydNormovolemia", "hydHypervolemia", "hydHypovolemia", "hydUOP", "hydIVC", "hydCVP", "hemoStable", "hemoUnstable", "hemoVasopressor", "feedOral", "feedNG", "feedTPN", "feedRate", "ivFluidsRate", "sedPropofol", "sedKetamine", "sedMidazolam", "sedRemif", "sedMR", "sedOther", "clinicalNotes", "planVentilatory", "planPhysio", "planConsult", "planInvestigation", "planOther", "planFuture", "planHomeTeam", "createdAt", "updatedAt") FROM stdin;
44625af3-6f24-495e-b844-bb7eae0962b8	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	2026-02-24 00:00:00	Day		t	f	f	f	f	f	CKD				f	f	f				f	f	f	f	f	f	f	f				f	f	f	f	f	f			f	f	f	f	f										2026-02-24 17:43:52.106	2026-02-24 17:43:52.106
18aa82ca-e4c2-40e7-b775-550c619f943a	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	2026-02-24 00:00:00	Day		t	f	f	f	f	f	CKD	E4V1M4			f	f	t	PS	40	10	t	t	f	t	f	t	f	f	100	2.2		t	f	f	f	f	f	feeding stopped	100	f	f	f	f	f				nurse called fromt the ward by request of the relative	hasan aldabagh for ptt 67	baseline + crp	consultation to hasan aldabagh ptt 67	monitor IVC regulary		2026-02-24 17:45:47.664	2026-02-24 17:45:47.664
\.


--
-- Data for Name: Specialty; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Specialty" (id, name, "createdAt") FROM stdin;
b385ddf8-81b0-4f81-adf4-afae5ad1570d	Neurosurgery	2026-02-24 17:23:09.234
ab7d09ec-f5af-443d-9052-454336241359	NeuroMedicine	2026-02-26 08:54:42.483
16726f74-dc70-4516-8395-8fe12a694b97	Ortho	2026-02-26 09:28:52.221
912423fe-c441-42bd-b338-2c809c22e908	doctor	2026-03-09 22:12:07.292
5822e280-8087-40c7-8390-a8bda78a705b	Gyanocology	2026-03-11 12:21:27.518
1839f81b-d683-453f-9a2c-9ec4f83550ce	Cardiology	2026-03-12 08:37:01.866
\.


--
-- Data for Name: SyncLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SyncLog" (id, type, status, message, "startedAt", "endedAt", "resultsCount") FROM stdin;
3d2b33eb-c057-4464-b6b8-9fe699d35655	LAB_SYNC	SUCCESS	\N	2026-03-10 09:00:00.138	2026-03-10 09:09:35.5	0
1fc29653-30fc-46b1-9ead-f7069299ded5	LAB_SYNC	SUCCESS	\N	2026-03-10 10:00:00.059	2026-03-10 10:09:27.16	0
7977ed1f-428c-4faf-86d7-6aa351d09e09	LAB_SYNC	SUCCESS	\N	2026-03-10 11:00:00.054	2026-03-10 11:10:20.481	0
b1742727-29c6-4de4-addc-db4b5ebee042	LAB_SYNC	SUCCESS	\N	2026-03-10 12:00:00.245	2026-03-10 12:09:25.112	0
9b20bb36-a6c0-451e-8b65-9e9e88f6103e	LAB_SYNC	SUCCESS	\N	2026-03-10 12:54:34.583	2026-03-10 13:02:02.384	0
8faf75f9-4a91-43f2-84c7-840d7222eb23	LAB_SYNC	SUCCESS	\N	2026-03-10 13:00:06.058	2026-03-10 13:07:10.573	0
40b6ec3f-dd46-4181-baa3-a9aa9a18a177	LAB_SYNC	RUNNING	\N	2026-03-10 14:00:03.763	\N	0
8f467ccb-b550-4cbe-9f34-2a5d19ebbc69	LAB_SYNC	SUCCESS	\N	2026-03-10 15:00:03.404	2026-03-10 15:06:48.14	0
927dd16e-9303-4c68-b198-30626d7d7e11	LAB_SYNC	RUNNING	\N	2026-03-10 16:00:04.267	\N	0
37773da5-6ddb-40cc-bb7f-677481bb3bca	LAB_SYNC	SUCCESS	\N	2026-03-10 17:00:07.453	2026-03-10 17:06:34.561	0
958b3928-3c4f-41f9-8eb9-f402f513e820	LAB_SYNC	SUCCESS	\N	2026-03-10 18:00:05.206	2026-03-10 18:07:02.329	0
68df7c4a-2001-4844-8939-b28b27924978	LAB_SYNC	SUCCESS	\N	2026-03-10 19:00:04.133	2026-03-10 19:06:39.463	0
c2d53575-9aee-4d1d-baa0-2aadc8483c58	LAB_SYNC	SUCCESS	\N	2026-03-10 20:00:03.805	2026-03-10 20:06:28.315	0
93291561-5ec0-4faf-8b26-421aed1b27f7	LAB_SYNC	SUCCESS	\N	2026-03-10 21:00:04.185	2026-03-10 21:06:06.585	0
30837f41-fa06-4e82-9a10-2a29fc29b1c8	LAB_SYNC	SUCCESS	\N	2026-03-10 22:00:01.678	2026-03-10 22:06:02.08	0
5a99f645-c94a-4318-b40e-0d8dc54c24a3	LAB_SYNC	SUCCESS	\N	2026-03-10 23:00:03.412	2026-03-10 23:02:20.684	16
11cb3268-e722-4b72-9256-b2e9472571d3	LAB_SYNC	SUCCESS	\N	2026-03-11 00:00:10.759	2026-03-11 00:05:14.663	61
8bab66ae-37a6-4a3b-a6e0-b0915620f305	LAB_SYNC	SUCCESS	\N	2026-03-11 01:00:03.94	2026-03-11 01:00:32.069	0
7454272b-62a6-45e5-8893-086b0084dbc3	LAB_SYNC	SUCCESS	\N	2026-03-11 02:00:04.62	2026-03-11 02:00:32.07	0
f909130f-fb03-4702-856e-7bce5a9e7c04	LAB_SYNC	SUCCESS	\N	2026-03-11 03:00:03.398	2026-03-11 03:00:32.516	0
db11261e-69de-4351-b264-7adc97e0ec50	LAB_SYNC	SUCCESS	\N	2026-03-11 04:00:01.615	2026-03-11 04:00:32.487	0
d930f3d4-442d-46cc-ad48-cba8647ee8fc	LAB_SYNC	SUCCESS	\N	2026-03-11 05:00:04.251	2026-03-11 05:00:28.735	0
fd0a38bf-89d6-4114-b4a7-e64a6eb1b2e3	LAB_SYNC	SUCCESS	\N	2026-03-11 06:00:02.27	2026-03-11 06:00:31.134	0
e092dff1-2e41-497f-bb37-2187739353af	LAB_SYNC	SUCCESS	\N	2026-03-11 07:00:04.989	2026-03-11 07:02:38.708	21
7cd229f7-aa15-456b-b4dd-d5054fc0e980	LAB_SYNC	SUCCESS	\N	2026-03-11 09:00:02.562	2026-03-11 09:00:50.281	0
d1c8a570-45cb-4bf1-adc9-5f29d89d949f	LAB_SYNC	SUCCESS	\N	2026-03-11 10:00:02.287	2026-03-11 10:01:00.719	0
33292fb9-d6c4-4345-9c2c-7b6d463e9d18	LAB_SYNC	SUCCESS	\N	2026-03-11 11:00:05.924	2026-03-11 11:00:54.952	0
e2c14c8a-3c8b-4a96-bde7-380d2138493b	LAB_SYNC	SUCCESS	\N	2026-03-11 12:00:03.031	2026-03-11 12:00:57.789	0
018f871b-0ef3-4f39-b69a-dbb15a640285	LAB_SYNC	SUCCESS	\N	2026-03-11 13:00:09.078	2026-03-11 13:01:52.12	0
d31c650f-a0dc-4db5-8fc0-a1ce3657e33f	LAB_SYNC	SUCCESS	\N	2026-03-11 14:00:06.182	2026-03-11 14:01:32.225	0
a74c1304-dfce-4ce4-86fa-58e4b6dc0e62	LAB_SYNC	SUCCESS	\N	2026-03-11 15:00:03.437	2026-03-11 15:01:36.255	0
837db2d2-79aa-4267-ae0e-88cbe114dc09	LAB_SYNC	SUCCESS	\N	2026-03-11 16:00:04.005	2026-03-11 16:01:35.738	0
5a76cb64-07d3-4014-a8a9-e5895a8defdb	LAB_SYNC	SUCCESS	\N	2026-03-11 17:00:04.691	2026-03-11 17:01:29.411	0
a91c710a-d784-458f-b6bf-43eb6f082248	LAB_SYNC	SUCCESS	\N	2026-03-11 18:00:02.459	2026-03-11 18:01:34.436	0
84ff2629-e886-4aa5-b84d-15636bd028c2	LAB_SYNC	SUCCESS	\N	2026-03-11 19:00:03.405	2026-03-11 19:01:13.306	1
6a168a55-713c-49ae-95dd-830443762222	LAB_SYNC	SUCCESS	\N	2026-03-11 20:00:04.797	2026-03-11 20:00:58.545	1
c3c4fdfc-cda0-4ea6-be05-23cb293d4297	LAB_SYNC	SUCCESS	\N	2026-03-11 21:00:02.711	2026-03-11 21:01:11.837	1
90fc3fb3-badf-46de-b2ed-d9f141ad38ca	LAB_SYNC	SUCCESS	\N	2026-03-11 22:00:04.824	2026-03-11 22:00:29.411	0
72a1f9bf-ac50-43ea-b874-01f859982001	LAB_SYNC	SUCCESS	\N	2026-03-11 23:00:05.819	2026-03-11 23:04:03.71	0
68e32294-1665-4483-a38d-85e7ce6a2819	LAB_SYNC	SUCCESS	\N	2026-03-12 00:00:09.501	2026-03-12 00:04:05.224	0
6d823e84-5ef8-4b23-a6ad-63155ea581a1	LAB_SYNC	SUCCESS	\N	2026-03-12 01:00:05.77	2026-03-12 01:03:57.948	0
26806825-5b3f-4cc2-b02a-fbb8ee40a93d	LAB_SYNC	SUCCESS	\N	2026-03-12 02:00:03.978	2026-03-12 02:03:46.33	0
3438f6b7-ade0-406a-bf85-c6b0a65083b5	LAB_SYNC	SUCCESS	\N	2026-03-12 03:00:05.211	2026-03-12 03:03:48.01	0
4d7848bd-791f-4934-b231-5a59afd7a786	LAB_SYNC	SUCCESS	\N	2026-03-12 04:00:05.335	2026-03-12 04:03:43.393	0
9c706391-eee0-4708-994a-c10f4dd1a081	LAB_SYNC	SUCCESS	\N	2026-03-12 05:00:04.484	2026-03-12 05:03:42.832	0
2a9d0a62-f7a9-408b-8714-7d3ccfce95c6	LAB_SYNC	SUCCESS	\N	2026-03-12 06:00:03.635	2026-03-12 06:03:46.29	0
317409a7-2fa4-4e51-86e1-9db68f3d7745	LAB_SYNC	SUCCESS	\N	2026-03-12 07:00:06.245	2026-03-12 07:04:18.484	0
dab3cc3a-80a8-4063-928a-05d68cd6a887	LAB_SYNC	SUCCESS	\N	2026-03-12 08:00:07.079	2026-03-12 08:04:10.318	0
68e10264-269d-4b92-93ab-5023a5027500	LAB_SYNC	SUCCESS	\N	2026-03-12 09:00:04.994	2026-03-12 09:04:39.179	0
4eb12ed5-d75b-48b1-b78a-44c3fee4c78c	LAB_SYNC	RUNNING	\N	2026-03-12 10:00:05.218	\N	0
b49b0c3f-3036-4751-8ca7-a720d67594e5	LAB_SYNC	SUCCESS	\N	2026-03-12 11:00:03.161	2026-03-12 11:05:04.375	0
5eb76a96-c5bf-4deb-b61b-0cf70efe1e4e	LAB_SYNC	SUCCESS	\N	2026-03-12 12:00:05.77	2026-03-12 12:05:27.35	0
33aee0c6-77c0-46ea-b62b-6c9acceb6469	LAB_SYNC	SUCCESS	\N	2026-03-12 13:00:05.689	2026-03-12 13:05:23.832	0
ebf5bee9-76b7-4a68-84ed-4b374b911178	LAB_SYNC	SUCCESS	\N	2026-03-12 14:00:04.869	2026-03-12 14:05:16.533	0
849e9d59-164b-49dd-a65d-fa10201320b8	LAB_SYNC	SUCCESS	\N	2026-03-12 15:00:04.325	2026-03-12 15:05:31.11	0
76bb6a22-62bf-4837-8fa1-e118c7e89fcc	LAB_SYNC	SUCCESS	\N	2026-03-12 16:00:05.837	2026-03-12 16:07:03.592	0
c9a2263a-439e-4e92-ae8e-5e48713c03ec	LAB_SYNC	SUCCESS	\N	2026-03-12 17:00:04.598	2026-03-12 17:04:53.925	0
ec70ff97-5052-4217-8f18-660a04050aa3	LAB_SYNC	SUCCESS	\N	2026-03-12 18:00:04.685	2026-03-12 18:04:50.557	0
fa419d2e-4238-4689-ae19-4cb4f1a42591	LAB_SYNC	SUCCESS	\N	2026-03-12 19:00:06.252	2026-03-12 19:05:33.96	0
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, username, "passwordHash", role, "createdAt", "updatedAt", "dismissedLabs") FROM stdin;
a2497fb8-1acf-44d4-a3bf-9289be25efe9	Dr.Younis	dryounis	$2b$10$WPlAyk0923oZ1.Cxsgc20OVz1ejbRx5tI7qTofqfuV0Wwa/7zOKAm	SENIOR	2026-02-18 18:53:55.693	2026-02-18 18:53:55.693	{}
5b20a754-011e-4397-bec5-669052083cb6	Dr.Mustafa	drmustafa	$2b$10$vDTfzQX0KPGCgaDUNV2O4eLDYexe5gI1AueP0F5KBV54VFpKmQNVG	SENIOR	2026-02-18 18:54:11.191	2026-02-18 18:54:11.191	{}
241b2d5b-047f-4692-a9a0-ed14684c1b58	Dr. Ahmed Waleed	drahmed	$2b$10$Roek8SysrNzLz1eiAaN6e.6YeJm3/t9AjeZ8aGgz/7x763nwxtLL.	SENIOR	2026-02-18 18:54:24.686	2026-02-18 18:54:24.686	{}
6155c4b9-faf9-4a3e-80b5-8107f21b3d25	Dr. Mohammed Salim	drmohammed	$2b$10$iU24siJCxu8FPlqngi2gw.VV8LWdo.t7gwdcV8yz39xVO6cJYSaEW	SENIOR	2026-02-18 18:54:36.018	2026-02-18 18:54:36.018	{}
2806f3c1-e62a-468a-be59-838db585a8f9	Dr. Mustafa Gayath	drgayath	$2b$10$J/n78FVPLqTr8KpIpgIzneA.b3Hexq4snangFNplfWIzQemtXF6Xq	SENIOR	2026-02-18 18:54:59.807	2026-02-18 18:54:59.807	{}
23eb1a26-45fb-4779-bd53-a5b899d65e33	Dr. Muhammed Hisham	drhisham	$2b$10$bHdZkzs7AeQu87FwnEy/1.b2HrCSB11lHgbAuzss511XHTG11kBWG	SENIOR	2026-02-18 18:55:09.887	2026-02-18 18:55:09.887	{}
1aefc527-404f-4343-a895-2049ca33bbe1	Dr. Abduall Sameer	drsameer	$2b$10$YQ37Ew.j/D2HbLnY1nIf.uLUekFOHvaF8J7n/tyamMg2JHSwbfNMC	RESIDENT	2026-02-18 18:55:29.549	2026-02-18 18:55:29.549	{}
6d446f1d-90b6-4ccd-9dab-8016f92e4004	Dr. Abdullah Al-Qazaz	drqazaz	$2b$10$tY7kC/YlS.vH1GWjpaxbzuC3gqcxB0pCiEouZ91MVb6.xKizh9ujq	RESIDENT	2026-02-18 18:55:45.825	2026-02-18 18:55:45.825	{}
946f950c-bd96-4e3e-8624-e7d2da081a0a	Dr. Bilal Dabdoob	drbilal	$2b$10$67jmUziCVIyKO/Nw0IPiteB7ABHX9SFLpMUn48qvgobtEFn9KYSBG	RESIDENT	2026-02-18 18:56:00.258	2026-02-18 18:56:00.258	{}
5d80b288-c3a7-4d34-bbb2-6f825244884d	Dr. Mohammed Luay	drluay	$2b$10$7T.8mSOwnZE0EUqERapXH.FNLrm4lmj6s3aCZMA2MdAp0phqVIC4e	RESIDENT	2026-02-18 18:56:17.568	2026-02-18 18:56:17.568	{}
5c9cb127-d961-4f7a-a714-ac58833eaef3	qahtan	qahtan	$2b$10$oqPd.AWQlG3jQjGgR0eIUOyAKD4fdb5tzCdeU6W1FtbaNQrQTbuw2	NURSE	2026-02-18 18:57:15.362	2026-02-18 18:57:15.362	{}
028720b6-9103-4f9c-b6d7-c5dbffaae67b	ahmed najim	najim	$2b$10$Y.I3l6JoetZc.jfU6anW/.OUp0NqOPnmRa0wK030ZSuYg.ndZ2hlS	NURSE	2026-02-18 18:57:29.896	2026-02-18 18:57:29.896	{}
a587c936-2807-4a41-8fd3-51a9e98696e2	hameed	hameed	$2b$10$NKEGiDO2SR2Z56M8ur0INu09vUpYa9ZY53EHbKA1C21awlRKCIcEy	NURSE	2026-02-18 18:57:38.495	2026-02-18 18:57:38.495	{}
9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	arqam	arqam	$2b$10$Et9GZPteEDawFQLPOEYA/OvK2gDOYMX5jV5v8SU3sDPHJsa26ofWG	NURSE	2026-02-18 18:57:46.457	2026-02-18 18:57:46.457	{}
55e877af-275d-4635-bf21-d2b5587de171	taha	taha	$2b$10$o9/HfGyGeu7oMQvtlU8LfuJOXMhEaXs3PcGsCBK/skDqQHtvZt66y	NURSE	2026-02-18 18:57:54.707	2026-02-18 18:57:54.707	{}
534a3211-0638-4085-b75c-5a4b5dc7741a	ibraheem enad	enad	$2b$10$nUIpnLMDNv.CwPFNv4nWneGwY1bhZ1Y.Mb/qgCD7rAvQo9E9RKYcC	NURSE	2026-02-18 18:58:07.529	2026-02-18 18:58:07.529	{}
188b6fa9-2be1-455a-b1f1-75ca5662abff	mahmood yaseen	yaseen	$2b$10$YuBHl6xmS.nEEoFnVDeb/ejvybGr0kzMX3o6h2fijr2ah6i57p1yC	NURSE	2026-02-18 18:58:21.026	2026-02-18 18:58:21.026	{}
00cc4e53-6a6e-4d4b-8486-4f8991665e2c	yaseen fadhel	fadhel	$2b$10$5xdy1hc7JecXQwOZ/IJVt.HenwG.pOzfGzUL1PigOS490liPcSHmq	NURSE	2026-02-18 18:58:30.426	2026-02-18 18:58:30.426	{}
mock-nurse-id	Jane Nurse	nurse	$2b$10$psSQlJwkhZkHMUEChc67nOB3y4k9lkxhnqr4sHPEpSdw2P6cwbC5O	NURSE	2026-02-18 18:16:21.236	2026-02-23 22:27:26.547	{}
5a476d92-d719-4322-a10f-b6f747686e00	mahmood abd	mahmood	$2b$10$k8Bklc/H/WImwTTaWh2.3.gm4wplLt/hnhkcgXqtAeYnBGo82erwO	NURSE	2026-03-09 09:55:56.226	2026-03-09 09:55:56.226	{}
mock-senior-id	Dr. House	senior	$2b$10$psSQlJwkhZkHMUEChc67nOB3y4k9lkxhnqr4sHPEpSdw2P6cwbC5O	SENIOR	2026-02-18 18:16:21.246	2026-03-11 08:09:23.073	{cb3ee053-f43f-426e-bbb1-2e2d35540a27,7d29d42f-f18d-4c59-a02b-8643e636895c,5d142492-cc51-4c6d-82d1-21da668e303c,f195f321-304d-4153-9367-086b93c265b0,fd2c0625-077a-4d31-b5da-700ae17dccbc}
\.


--
-- Data for Name: VentilatorSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VentilatorSetting" (id, "patientId", "userId", mode, rate, fio2, ie, ps, vt, "timestamp") FROM stdin;
\.


--
-- Data for Name: VitalSign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VitalSign" (id, "patientId", "heartRate", "bpSys", "bpDia", spo2, temp, rbs, "timestamp", "imageUrl", rr) FROM stdin;
ab9044b0-cff1-459b-84bf-ca11641479fe	68baae90-91be-4b76-9d3b-7e5e423a0523	57	138	62	99	35.9	110	2026-02-24 17:54:53.587	\N	\N
fc8eb844-a76b-483b-97c5-90a5f5999974	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	117	60	95	37	105	2026-02-17 11:00:51.913	\N	\N
7f343558-1758-47b2-a372-de7d51f83936	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	126	79	96	36.9	\N	2026-02-17 12:00:51.913	\N	\N
813806ce-9d15-46b6-b601-cbc6106ea2c1	4f8820ab-0ca8-4844-9f44-51a795c334ae	70	136	78	98	37.8	\N	2026-02-17 13:00:51.913	\N	\N
64e7d382-5efc-469f-94b2-21df98350c29	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	131	74	96	36.5	\N	2026-02-17 14:00:51.913	\N	\N
a1d54ed8-e024-479f-9904-8b65b03ff2fa	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	113	67	96	37.2	125	2026-02-17 15:00:51.913	\N	\N
69570cdd-1f1a-4fce-a7b4-fc49c37eb934	4f8820ab-0ca8-4844-9f44-51a795c334ae	89	133	65	95	37.7	\N	2026-02-17 16:00:51.913	\N	\N
9da5ec72-949e-45e8-a8d3-9cce1864fc35	4f8820ab-0ca8-4844-9f44-51a795c334ae	93	118	79	95	36.8	\N	2026-02-17 17:00:51.913	\N	\N
bcd6a0e2-2e21-413c-a245-5a4cf88edc44	4f8820ab-0ca8-4844-9f44-51a795c334ae	61	137	75	98	36.6	\N	2026-02-17 18:00:51.913	\N	\N
7fc9df36-9a1c-49e7-80b2-43c176d026fe	4f8820ab-0ca8-4844-9f44-51a795c334ae	88	125	69	95	37.2	98	2026-02-17 19:00:51.913	\N	\N
9fcaedca-84fe-45f2-8f3e-09c96e027430	4f8820ab-0ca8-4844-9f44-51a795c334ae	85	138	77	98	37.2	\N	2026-02-17 20:00:51.913	\N	\N
84291e54-5777-42ba-a5ff-0bf01586fc4a	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	131	78	94	36.9	\N	2026-02-17 21:00:51.913	\N	\N
3be89f32-8a78-439a-b0b5-562db83cdd15	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	133	65	98	37.8	\N	2026-02-17 22:00:51.913	\N	\N
09f25244-860a-47ee-91a2-e8f8aaf6f445	4f8820ab-0ca8-4844-9f44-51a795c334ae	60	117	66	99	37.5	80	2026-02-17 23:00:51.913	\N	\N
c9842e02-3c19-4143-b24a-c510a5faf652	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	133	77	99	37.8	\N	2026-02-18 00:00:51.913	\N	\N
ffa87918-a9b7-4b45-9296-061481409fd6	4f8820ab-0ca8-4844-9f44-51a795c334ae	72	114	73	94	37.6	\N	2026-02-18 01:00:51.913	\N	\N
5b4f1f4e-5684-4f2c-926b-035a7efec03e	4f8820ab-0ca8-4844-9f44-51a795c334ae	95	139	76	98	37.3	\N	2026-02-18 02:00:51.913	\N	\N
d07252e9-7cb0-48b7-a223-554851dbc27a	4f8820ab-0ca8-4844-9f44-51a795c334ae	70	113	75	99	36.9	134	2026-02-18 03:00:51.913	\N	\N
46932648-a5ee-44ee-bb1e-9d55ce0b9fce	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	118	78	95	37.3	\N	2026-02-18 04:00:51.913	\N	\N
7fec3b12-b0e5-452d-a618-74f4e45070b5	4f8820ab-0ca8-4844-9f44-51a795c334ae	84	118	70	97	37.8	\N	2026-02-18 05:00:51.913	\N	\N
27bd6ee4-5ae9-4963-ace1-60500e53849a	4f8820ab-0ca8-4844-9f44-51a795c334ae	80	117	72	96	38	\N	2026-02-18 06:00:51.913	\N	\N
1d6ce2ff-c95c-40e6-9106-1305f25e0f19	4f8820ab-0ca8-4844-9f44-51a795c334ae	61	120	74	94	37	139	2026-02-18 07:00:51.913	\N	\N
cc176e08-bf60-4abf-a490-6daed21595fa	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	118	66	95	36.5	\N	2026-02-18 08:00:51.913	\N	\N
2c79a2fa-fe13-46f3-bc4e-eef875399a85	4f8820ab-0ca8-4844-9f44-51a795c334ae	82	135	67	95	36.7	\N	2026-02-18 09:00:51.913	\N	\N
e27e99f1-930b-4877-b8ad-47d61efde5c3	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	118	60	98	37.9	\N	2026-02-18 10:00:51.913	\N	\N
6735c015-3646-42c5-a971-bcf042a9b183	4f8820ab-0ca8-4844-9f44-51a795c334ae	74	125	75	96	37.4	131	2026-02-18 11:00:51.913	\N	\N
c9100739-70d3-498c-9cff-43c8a0cf73fe	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	116	72	96	36.9	\N	2026-02-18 12:00:51.913	\N	\N
7470185a-cd72-4aa0-bfd3-697246a26b09	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	128	76	97	37.1	\N	2026-02-18 13:00:51.913	\N	\N
2beee937-0958-4025-a3fa-5e677d62277e	4f8820ab-0ca8-4844-9f44-51a795c334ae	93	128	74	99	37.6	\N	2026-02-18 14:00:51.913	\N	\N
89a7c151-2a82-464b-a102-ecda679f50a7	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	130	70	98	37.7	95	2026-02-18 15:00:51.913	\N	\N
019ea3bd-427c-4d15-a908-0ae9374429e4	4f8820ab-0ca8-4844-9f44-51a795c334ae	96	129	72	96	38	\N	2026-02-18 16:00:51.913	\N	\N
8d807900-e572-4ac3-9731-7170087939ae	4f8820ab-0ca8-4844-9f44-51a795c334ae	80	137	64	96	37.3	\N	2026-02-18 17:00:51.913	\N	\N
ba08963e-6d80-4e50-8929-a4a077f6dda3	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	117	73	98	37.1	\N	2026-02-18 18:00:51.913	\N	\N
96c40479-a383-4b46-8b80-2ad56f26c69e	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	136	63	95	37.4	117	2026-02-18 19:00:51.913	\N	\N
93e47643-6b54-4f3d-9014-ee20f032d510	4f8820ab-0ca8-4844-9f44-51a795c334ae	83	119	74	97	36.8	\N	2026-02-18 20:00:51.913	\N	\N
0c9a04da-eed2-4ac2-a810-bebd8c1d6bb8	4f8820ab-0ca8-4844-9f44-51a795c334ae	90	131	60	95	38	\N	2026-02-18 21:00:51.913	\N	\N
a82e49a1-2c5a-4f8a-a78a-c90fa0abfe7d	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	114	69	99	36.6	\N	2026-02-18 22:00:51.913	\N	\N
411937eb-059b-4617-96ea-f305f48327aa	4f8820ab-0ca8-4844-9f44-51a795c334ae	79	122	65	96	37.7	115	2026-02-18 23:00:51.913	\N	\N
fccbaa7e-6585-42cb-a8b3-4f4cd0f33089	4f8820ab-0ca8-4844-9f44-51a795c334ae	77	121	62	99	37.9	\N	2026-02-19 00:00:51.913	\N	\N
65cbfea1-ae9f-4b68-b83f-3400b0e79a87	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	111	73	99	37.1	\N	2026-02-19 01:00:51.913	\N	\N
674fd3f4-846e-4d02-84a4-0a7001fc993b	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	131	60	98	37.9	\N	2026-02-19 02:00:51.913	\N	\N
0bc049d3-3362-4121-9130-a934d382d6f2	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	119	65	97	37.9	104	2026-02-19 03:00:51.913	\N	\N
56f46c91-c3aa-45aa-893f-9e96b963f842	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	128	70	94	37	\N	2026-02-19 04:00:51.913	\N	\N
56726036-f1bc-499b-9d03-c74ad2ef3898	4f8820ab-0ca8-4844-9f44-51a795c334ae	83	114	67	99	36.7	\N	2026-02-19 05:00:51.913	\N	\N
9828245d-4525-4f5c-a208-dc72fcfa585d	4f8820ab-0ca8-4844-9f44-51a795c334ae	65	128	60	96	37.4	\N	2026-02-19 06:00:51.913	\N	\N
5de15164-7faf-45a8-aa5d-8b358bd905ec	4f8820ab-0ca8-4844-9f44-51a795c334ae	65	128	64	98	36.9	98	2026-02-19 07:00:51.913	\N	\N
f61a67b8-eedf-48bc-ad22-a668135fad3d	4f8820ab-0ca8-4844-9f44-51a795c334ae	75	137	77	97	37.1	\N	2026-02-19 08:00:51.913	\N	\N
90acdfc2-aafa-475b-bd75-ec62280bb562	4f8820ab-0ca8-4844-9f44-51a795c334ae	99	117	70	95	36.7	\N	2026-02-19 09:00:51.913	\N	\N
c6e6e4aa-cbc0-4a04-9131-2aa580b8d1f2	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	133	68	99	36.9	\N	2026-02-19 10:00:51.913	\N	\N
c914d4f5-bfd8-487f-9f07-744c1e4f4e5f	68baae90-91be-4b76-9d3b-7e5e423a0523	80	133	56	96	39.2	\N	2026-02-26 17:49:47.747	\N	\N
62e8b8a3-357e-418f-85fb-719061f1e5ab	68baae90-91be-4b76-9d3b-7e5e423a0523	100	\N	\N	\N	\N	110	2026-03-08 14:35:47.927	\N	\N
1c789f98-28ef-4147-82ba-9fea002a0762	949d4d05-0ff6-4f4d-824f-33b2b25fa073	110	110	70	88	37	40	2026-03-08 21:18:20.17	\N	\N
39b4c62e-288a-420e-b54b-7cc3259b0f8d	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	89	150	77	99	35.3	259	2026-03-09 09:54:54.663	\N	\N
bc4295de-792b-472f-9299-92c3ab826574	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	89	141	78	99	35.4	\N	2026-03-09 09:58:32.848	\N	\N
41bbd8c9-37f4-4ab2-814d-57e444a5d432	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	90	147	78	99	37.4	267	2026-03-09 10:17:11.796	\N	\N
37a1a8df-fe0a-4dfe-993f-bb662af8cdd9	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	100	153	76	99	37.2	\N	2026-03-09 11:25:27.934	\N	\N
98310975-aa49-448d-af30-963f89e1358b	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	93	158	78	98	37.2	\N	2026-03-09 12:30:23.944	\N	\N
b5e8c8c3-ad87-4760-b026-e430626154f1	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	\N	\N	\N	\N	\N	\N	2026-03-09 12:30:24.467	\N	\N
98f5901e-3372-4bbd-9b82-eb6a0e0093b6	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	97	143	78	98	35.9	272	2026-03-09 14:02:20.111	\N	\N
9b8b99e4-0f94-497e-8afd-d75e2a575382	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	97	143	78	98	35.9	272	2026-03-09 14:02:20.899	\N	\N
410f4b70-a8fd-487d-81d0-01a0e2ff2e75	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	102	142	79	98	37.2	\N	2026-03-09 14:15:17.848	\N	\N
0a10c1c7-6328-4b01-b6d5-24df1db741ca	8b0b885c-e27a-454c-bdc8-7ecd85bb96ad	94	143	76	96	36.1	\N	2026-03-09 15:12:07.799	/uploads/files-1773069116965-358892008.jpg	\N
a75a95b7-caf3-4ef5-8832-6704de5944e9	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	77	160	69	93	36.1	\N	2026-03-10 08:32:29.85	/uploads/files-1773131521803-300617907.jpg	23
0881ee30-15be-48d3-95fb-34ec01b2dc56	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	84	171	72	93	36.2	\N	2026-03-10 09:03:18.511	/uploads/files-1773133363851-717002375.jpg	26
c76a6ec6-4cda-45ca-a658-c04f1a338f57	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	\N	\N	\N	\N	\N	2026-03-10 09:40:57.026	\N	\N
b99c6e33-1b0b-442b-87f2-cbbe726e480c	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	\N	\N	\N	\N	\N	2026-03-10 09:40:58.018	\N	\N
9bdec212-ccc7-451c-bb57-b93ce3602651	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	74	166	73	97	36	164	2026-03-10 09:41:48.526	/uploads/files-1773135676942-153437333.jpg	\N
6aac3e5b-7540-4577-b0e4-0c2d6d2e8cff	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	\N	\N	\N	\N	\N	2026-03-10 11:03:35.484	\N	\N
3ed64086-210b-440e-8048-58c024997528	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	83	170	72	97	36	\N	2026-03-10 11:04:33.908	/uploads/files-1773140634617-863572618.jpg	\N
\.


--
-- Name: Admission Admission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ClinicalNote ClinicalNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalNote"
    ADD CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY (id);


--
-- Name: ClinicalOrder ClinicalOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalOrder"
    ADD CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY (id);


--
-- Name: Consultation Consultation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Consultation"
    ADD CONSTRAINT "Consultation_pkey" PRIMARY KEY (id);


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: DrugCatalog DrugCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrugCatalog"
    ADD CONSTRAINT "DrugCatalog_pkey" PRIMARY KEY (id);


--
-- Name: Governorate Governorate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Governorate"
    ADD CONSTRAINT "Governorate_pkey" PRIMARY KEY (id);


--
-- Name: IntakeOutput IntakeOutput_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntakeOutput"
    ADD CONSTRAINT "IntakeOutput_pkey" PRIMARY KEY (id);


--
-- Name: Investigation Investigation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Investigation"
    ADD CONSTRAINT "Investigation_pkey" PRIMARY KEY (id);


--
-- Name: MedicationAdministration MedicationAdministration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MedicationAdministration"
    ADD CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY (id);


--
-- Name: Medication Medication_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_pkey" PRIMARY KEY (id);


--
-- Name: NurseCheckIn NurseCheckIn_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NurseCheckIn"
    ADD CONSTRAINT "NurseCheckIn_pkey" PRIMARY KEY (id);


--
-- Name: PatientAssignment PatientAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PatientAssignment"
    ADD CONSTRAINT "PatientAssignment_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Shift Shift_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);


--
-- Name: SkinAssessment SkinAssessment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SkinAssessment"
    ADD CONSTRAINT "SkinAssessment_pkey" PRIMARY KEY (id);


--
-- Name: SpecialistNote SpecialistNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpecialistNote"
    ADD CONSTRAINT "SpecialistNote_pkey" PRIMARY KEY (id);


--
-- Name: Specialty Specialty_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Specialty"
    ADD CONSTRAINT "Specialty_pkey" PRIMARY KEY (id);


--
-- Name: SyncLog SyncLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncLog"
    ADD CONSTRAINT "SyncLog_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VentilatorSetting VentilatorSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VentilatorSetting"
    ADD CONSTRAINT "VentilatorSetting_pkey" PRIMARY KEY (id);


--
-- Name: VitalSign VitalSign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VitalSign"
    ADD CONSTRAINT "VitalSign_pkey" PRIMARY KEY (id);


--
-- Name: Consultation_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Consultation_orderId_key" ON public."Consultation" USING btree ("orderId");


--
-- Name: DrugCatalog_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DrugCatalog_name_key" ON public."DrugCatalog" USING btree (name);


--
-- Name: Governorate_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Governorate_name_key" ON public."Governorate" USING btree (name);


--
-- Name: Patient_mrn_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Patient_mrn_key" ON public."Patient" USING btree (mrn);


--
-- Name: Specialty_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Specialty_name_key" ON public."Specialty" USING btree (name);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Admission Admission_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Admission Admission_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Admission Admission_specialtyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES public."Specialty"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicalNote ClinicalNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalNote"
    ADD CONSTRAINT "ClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicalNote ClinicalNote_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalNote"
    ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicalOrder ClinicalOrder_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalOrder"
    ADD CONSTRAINT "ClinicalOrder_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClinicalOrder ClinicalOrder_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalOrder"
    ADD CONSTRAINT "ClinicalOrder_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClinicalOrder ClinicalOrder_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClinicalOrder"
    ADD CONSTRAINT "ClinicalOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Consultation Consultation_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Consultation"
    ADD CONSTRAINT "Consultation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."ClinicalOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Consultation Consultation_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Consultation"
    ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Doctor Doctor_specialtyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES public."Specialty"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IntakeOutput IntakeOutput_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntakeOutput"
    ADD CONSTRAINT "IntakeOutput_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IntakeOutput IntakeOutput_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntakeOutput"
    ADD CONSTRAINT "IntakeOutput_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IntakeOutput IntakeOutput_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntakeOutput"
    ADD CONSTRAINT "IntakeOutput_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Investigation Investigation_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Investigation"
    ADD CONSTRAINT "Investigation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Investigation Investigation_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Investigation"
    ADD CONSTRAINT "Investigation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."ClinicalOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Investigation Investigation_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Investigation"
    ADD CONSTRAINT "Investigation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MedicationAdministration MedicationAdministration_medicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MedicationAdministration"
    ADD CONSTRAINT "MedicationAdministration_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES public."Medication"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MedicationAdministration MedicationAdministration_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MedicationAdministration"
    ADD CONSTRAINT "MedicationAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MedicationAdministration MedicationAdministration_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MedicationAdministration"
    ADD CONSTRAINT "MedicationAdministration_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Medication Medication_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Medication"
    ADD CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NurseCheckIn NurseCheckIn_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NurseCheckIn"
    ADD CONSTRAINT "NurseCheckIn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NurseCheckIn NurseCheckIn_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NurseCheckIn"
    ADD CONSTRAINT "NurseCheckIn_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: NurseCheckIn NurseCheckIn_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NurseCheckIn"
    ADD CONSTRAINT "NurseCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PatientAssignment PatientAssignment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PatientAssignment"
    ADD CONSTRAINT "PatientAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PatientAssignment PatientAssignment_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PatientAssignment"
    ADD CONSTRAINT "PatientAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PatientAssignment PatientAssignment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PatientAssignment"
    ADD CONSTRAINT "PatientAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Shift Shift_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SkinAssessment SkinAssessment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SkinAssessment"
    ADD CONSTRAINT "SkinAssessment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SkinAssessment SkinAssessment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SkinAssessment"
    ADD CONSTRAINT "SkinAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SpecialistNote SpecialistNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpecialistNote"
    ADD CONSTRAINT "SpecialistNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SpecialistNote SpecialistNote_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpecialistNote"
    ADD CONSTRAINT "SpecialistNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VentilatorSetting VentilatorSetting_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VentilatorSetting"
    ADD CONSTRAINT "VentilatorSetting_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VitalSign VitalSign_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VitalSign"
    ADD CONSTRAINT "VitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 5ifQHSQATbvZcTtprLYc2Y5bPbexC2ZfRScI7RyBgaizEbo9qTKlLCuZCxf7JT2

