--
-- PostgreSQL database dump
--

\restrict N4LAdbdJNi3NvDyYjtGgwJaDzKzr3jSdmtkO97eSKGCQ4UfnBnrZtQmG57OrcBT

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Data for Name: Specialty; Type: TABLE DATA; Schema: public; Owner: postgres
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public."Specialty" DISABLE TRIGGER ALL;

COPY public."Specialty" (id, name, "createdAt") FROM stdin;
b385ddf8-81b0-4f81-adf4-afae5ad1570d	Neurosurgery	2026-02-24 17:23:09.234
\.


ALTER TABLE public."Specialty" ENABLE TRIGGER ALL;

--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Doctor" DISABLE TRIGGER ALL;

COPY public."Doctor" (id, name, "specialtyId", "createdAt") FROM stdin;
b852906e-3389-4e97-b9cf-8e8e6e4cc1e2	عمر غزال	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:23:09.265
527a9644-1722-4017-898d-43f8640921a8	Omar Ghazal	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:30:08.16
ad69b117-dc1f-4e39-b91e-51de1996e2d0	Omar Ghazal	b385ddf8-81b0-4f81-adf4-afae5ad1570d	2026-02-24 17:31:39.806
\.


ALTER TABLE public."Doctor" ENABLE TRIGGER ALL;

--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Patient" DISABLE TRIGGER ALL;

COPY public."Patient" (id, mrn, name, dob, gender, comorbidities, diagnosis, "createdAt", "updatedAt") FROM stdin;
38b62b34-4f1f-496f-974c-fb8fc34d934b	102873-0	حكمت عبدالرزاق	1954-02-18 18:32:45.672	Male	{NONE}	RTA	2026-02-18 18:32:45.689	2026-02-18 18:32:45.689
ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	316506-3	مينا مسافر علي حسين	2021-02-18 19:00:07.875	Female	{DM}	DKA with Complication	2026-02-18 19:00:07.882	2026-02-18 19:00:07.882
f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	323699-3	عبود هلال حمدي سليمان	1950-02-19 09:26:16.166	Male	{"HTN BPH"}	Stroke	2026-02-19 09:26:16.173	2026-02-19 09:26:16.173
4f8820ab-0ca8-4844-9f44-51a795c334ae	324142-3	زبيدة حسين	1980-01-01 00:00:00	Male	{"HTN DM"}	ACDF tumor	2026-02-19 11:00:51.777	2026-02-24 16:49:38.53
b97ca87a-eebf-436f-ab50-9477234dfaad	311903-3	احمد عبداللطيف سوعان	1971-02-24 16:50:58.915	Male	{HTN}	berry aneurysm rupture	2026-02-24 16:50:58.921	2026-02-24 16:50:58.921
68baae90-91be-4b76-9d3b-7e5e423a0523	322637-3	طلال مال الله رشيد خورشيد	1951-02-24 17:43:32.702	Male	{HTN,CKD}	ICH	2026-02-24 17:43:32.707	2026-02-24 17:45:47.673
\.


ALTER TABLE public."Patient" ENABLE TRIGGER ALL;

--
-- Data for Name: Admission; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Admission" DISABLE TRIGGER ALL;

COPY public."Admission" (id, "patientId", bed, diagnosis, "admittedAt", "dischargedAt", "doctorId", "specialtyId") FROM stdin;
49841245-80f5-4f97-bbea-cecf53733be1	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	RTA	2026-02-18 18:32:45.687	\N	\N	\N
93b3fd4d-1dae-41eb-b314-1f4b13bb7235	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	DKA with Complication	2026-02-18 19:00:07.88	\N	\N	\N
40d98931-21cd-43f3-bb61-d4e72133c5ff	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	Stroke	2026-02-19 09:26:16.171	\N	\N	\N
2256c097-a665-4106-b7bc-efde04fe95d3	4f8820ab-0ca8-4844-9f44-51a795c334ae	ICU-01	Sepsis	2026-02-16 11:00:51.774	\N	\N	\N
7646cef6-019f-40ae-a94b-6a570ac2df5e	b97ca87a-eebf-436f-ab50-9477234dfaad	\N	berry aneurysm rupture	2026-02-24 16:50:58.92	\N	\N	\N
ad5c7be1-969d-4d28-9f27-ebe40dae0bc5	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	ICH	2026-02-24 17:43:32.706	\N	527a9644-1722-4017-898d-43f8640921a8	b385ddf8-81b0-4f81-adf4-afae5ad1570d
\.


ALTER TABLE public."Admission" ENABLE TRIGGER ALL;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."User" DISABLE TRIGGER ALL;

COPY public."User" (id, name, username, "passwordHash", role, "createdAt", "updatedAt") FROM stdin;
a2497fb8-1acf-44d4-a3bf-9289be25efe9	Dr.Younis	dryounis	$2b$10$WPlAyk0923oZ1.Cxsgc20OVz1ejbRx5tI7qTofqfuV0Wwa/7zOKAm	SENIOR	2026-02-18 18:53:55.693	2026-02-18 18:53:55.693
5b20a754-011e-4397-bec5-669052083cb6	Dr.Mustafa	drmustafa	$2b$10$vDTfzQX0KPGCgaDUNV2O4eLDYexe5gI1AueP0F5KBV54VFpKmQNVG	SENIOR	2026-02-18 18:54:11.191	2026-02-18 18:54:11.191
241b2d5b-047f-4692-a9a0-ed14684c1b58	Dr. Ahmed Waleed	drahmed	$2b$10$Roek8SysrNzLz1eiAaN6e.6YeJm3/t9AjeZ8aGgz/7x763nwxtLL.	SENIOR	2026-02-18 18:54:24.686	2026-02-18 18:54:24.686
6155c4b9-faf9-4a3e-80b5-8107f21b3d25	Dr. Mohammed Salim	drmohammed	$2b$10$iU24siJCxu8FPlqngi2gw.VV8LWdo.t7gwdcV8yz39xVO6cJYSaEW	SENIOR	2026-02-18 18:54:36.018	2026-02-18 18:54:36.018
2806f3c1-e62a-468a-be59-838db585a8f9	Dr. Mustafa Gayath	drgayath	$2b$10$J/n78FVPLqTr8KpIpgIzneA.b3Hexq4snangFNplfWIzQemtXF6Xq	SENIOR	2026-02-18 18:54:59.807	2026-02-18 18:54:59.807
23eb1a26-45fb-4779-bd53-a5b899d65e33	Dr. Muhammed Hisham	drhisham	$2b$10$bHdZkzs7AeQu87FwnEy/1.b2HrCSB11lHgbAuzss511XHTG11kBWG	SENIOR	2026-02-18 18:55:09.887	2026-02-18 18:55:09.887
1aefc527-404f-4343-a895-2049ca33bbe1	Dr. Abduall Sameer	drsameer	$2b$10$YQ37Ew.j/D2HbLnY1nIf.uLUekFOHvaF8J7n/tyamMg2JHSwbfNMC	RESIDENT	2026-02-18 18:55:29.549	2026-02-18 18:55:29.549
6d446f1d-90b6-4ccd-9dab-8016f92e4004	Dr. Abdullah Al-Qazaz	drqazaz	$2b$10$tY7kC/YlS.vH1GWjpaxbzuC3gqcxB0pCiEouZ91MVb6.xKizh9ujq	RESIDENT	2026-02-18 18:55:45.825	2026-02-18 18:55:45.825
946f950c-bd96-4e3e-8624-e7d2da081a0a	Dr. Bilal Dabdoob	drbilal	$2b$10$67jmUziCVIyKO/Nw0IPiteB7ABHX9SFLpMUn48qvgobtEFn9KYSBG	RESIDENT	2026-02-18 18:56:00.258	2026-02-18 18:56:00.258
5d80b288-c3a7-4d34-bbb2-6f825244884d	Dr. Mohammed Luay	drluay	$2b$10$7T.8mSOwnZE0EUqERapXH.FNLrm4lmj6s3aCZMA2MdAp0phqVIC4e	RESIDENT	2026-02-18 18:56:17.568	2026-02-18 18:56:17.568
5c9cb127-d961-4f7a-a714-ac58833eaef3	qahtan	qahtan	$2b$10$oqPd.AWQlG3jQjGgR0eIUOyAKD4fdb5tzCdeU6W1FtbaNQrQTbuw2	NURSE	2026-02-18 18:57:15.362	2026-02-18 18:57:15.362
028720b6-9103-4f9c-b6d7-c5dbffaae67b	ahmed najim	najim	$2b$10$Y.I3l6JoetZc.jfU6anW/.OUp0NqOPnmRa0wK030ZSuYg.ndZ2hlS	NURSE	2026-02-18 18:57:29.896	2026-02-18 18:57:29.896
a587c936-2807-4a41-8fd3-51a9e98696e2	hameed	hameed	$2b$10$NKEGiDO2SR2Z56M8ur0INu09vUpYa9ZY53EHbKA1C21awlRKCIcEy	NURSE	2026-02-18 18:57:38.495	2026-02-18 18:57:38.495
9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	arqam	arqam	$2b$10$Et9GZPteEDawFQLPOEYA/OvK2gDOYMX5jV5v8SU3sDPHJsa26ofWG	NURSE	2026-02-18 18:57:46.457	2026-02-18 18:57:46.457
55e877af-275d-4635-bf21-d2b5587de171	taha	taha	$2b$10$o9/HfGyGeu7oMQvtlU8LfuJOXMhEaXs3PcGsCBK/skDqQHtvZt66y	NURSE	2026-02-18 18:57:54.707	2026-02-18 18:57:54.707
534a3211-0638-4085-b75c-5a4b5dc7741a	ibraheem enad	enad	$2b$10$nUIpnLMDNv.CwPFNv4nWneGwY1bhZ1Y.Mb/qgCD7rAvQo9E9RKYcC	NURSE	2026-02-18 18:58:07.529	2026-02-18 18:58:07.529
188b6fa9-2be1-455a-b1f1-75ca5662abff	mahmood yaseen	yaseen	$2b$10$YuBHl6xmS.nEEoFnVDeb/ejvybGr0kzMX3o6h2fijr2ah6i57p1yC	NURSE	2026-02-18 18:58:21.026	2026-02-18 18:58:21.026
00cc4e53-6a6e-4d4b-8486-4f8991665e2c	yaseen fadhel	fadhel	$2b$10$5xdy1hc7JecXQwOZ/IJVt.HenwG.pOzfGzUL1PigOS490liPcSHmq	NURSE	2026-02-18 18:58:30.426	2026-02-18 18:58:30.426
mock-nurse-id	Jane Nurse	nurse	$2b$10$psSQlJwkhZkHMUEChc67nOB3y4k9lkxhnqr4sHPEpSdw2P6cwbC5O	NURSE	2026-02-18 18:16:21.236	2026-02-23 22:27:26.547
mock-senior-id	Dr. House	senior	$2b$10$psSQlJwkhZkHMUEChc67nOB3y4k9lkxhnqr4sHPEpSdw2P6cwbC5O	SENIOR	2026-02-18 18:16:21.246	2026-02-23 22:27:26.583
\.


ALTER TABLE public."User" ENABLE TRIGGER ALL;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."AuditLog" DISABLE TRIGGER ALL;

COPY public."AuditLog" (id, action, details, "userId", "timestamp") FROM stdin;
\.


ALTER TABLE public."AuditLog" ENABLE TRIGGER ALL;

--
-- Data for Name: ClinicalNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."ClinicalNote" DISABLE TRIGGER ALL;

COPY public."ClinicalNote" (id, "patientId", "authorId", type, title, content, data, "createdAt", "updatedAt") FROM stdin;
b88aa163-1d0f-48d4-8c62-532b5d66d79f	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 1	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-17 22:00:51.913	2026-02-19 11:00:51.989
bac07690-c855-4f6d-adec-cf5eda39702b	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 2	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-18 10:00:51.913	2026-02-19 11:00:51.989
9fc2fb4a-6d51-4edf-b607-c0b9b50f8be1	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 3	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-18 22:00:51.913	2026-02-19 11:00:51.989
030b23bb-7822-4f95-839e-eebac1e40133	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	PROGRESS	Nursing Progress Note - Shift 4	Patient hemodynamically stable. Vitals maintained. I/O balanced. Plan to continue current management.	\N	2026-02-19 10:00:51.913	2026-02-19 11:00:51.989
\.


ALTER TABLE public."ClinicalNote" ENABLE TRIGGER ALL;

--
-- Data for Name: ClinicalOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."ClinicalOrder" DISABLE TRIGGER ALL;

COPY public."ClinicalOrder" (id, "patientId", "authorId", "approverId", type, status, priority, title, details, notes, "createdAt", "updatedAt") FROM stdin;
7eee75ea-b7b3-4709-8b57-35651ad57d90	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	mock-senior-id	mock-senior-id	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-18 19:00:07.893	2026-02-18 19:00:07.893
98bca48a-c57e-4332-b7ed-e87dc0f14c9f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-nurse-id	mock-nurse-id	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-19 09:26:16.185	2026-02-19 09:26:16.185
e2c418d7-98ec-47b2-8ee8-ca61fc1a4325	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-nurse-id	mock-nurse-id	PROCEDURE	APPROVED	ROUTINE	Tracheostomy	{"interventionType": "Tracheostomy"}	stop plavix and clexan	2026-02-24 15:29:43.461	2026-02-24 15:29:43.461
2d8aa5ef-6bc1-44c7-9b14-06f0cd0552a8	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-senior-id	mock-senior-id	NURSING	COMPLETED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-18 18:32:45.699	2026-02-24 15:30:05.803
7b1f4fc8-1e42-4d16-b5a8-3485f20e6fff	b97ca87a-eebf-436f-ab50-9477234dfaad	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-24 16:50:58.944	2026-02-24 16:50:58.944
6febd2a2-b246-4977-8561-3f6fc8c008ba	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	NURSING	APPROVED	ROUTINE	Admit Patient in HAMSA System	{"instruction": "Please complete admission in HAMSA hospital system to ICU"}	\N	2026-02-24 17:43:32.716	2026-02-24 17:43:32.716
d1a6fa05-5d6c-45f4-969c-4c007495b864	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	mock-senior-id	CONSULT	APPROVED	ROUTINE	Consultation to dr hasan aldabagh about ptt	{"info": ""}		2026-02-24 19:02:47.63	2026-02-24 19:02:47.63
\.


ALTER TABLE public."ClinicalOrder" ENABLE TRIGGER ALL;

--
-- Data for Name: DrugCatalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."DrugCatalog" DISABLE TRIGGER ALL;

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
\.


ALTER TABLE public."DrugCatalog" ENABLE TRIGGER ALL;

--
-- Data for Name: Governorate; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Governorate" DISABLE TRIGGER ALL;

COPY public."Governorate" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public."Governorate" ENABLE TRIGGER ALL;

--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Shift" DISABLE TRIGGER ALL;

COPY public."Shift" (id, "userId", type, "startTime", "endTime", "isActive") FROM stdin;
ae6e3f99-0ef7-409e-896d-81bc34900874	mock-senior-id	NIGHT	2026-02-18 18:19:04.679	\N	t
c2280ad8-fc45-4692-89f7-e269d7aff3d5	mock-nurse-id	DAY	2026-02-18 18:18:35.135	2026-02-19 08:49:57.055	f
393dc091-8f77-48c4-8592-66d6dfe727f6	mock-nurse-id	DAY	2026-02-19 09:31:11.761	2026-02-19 09:52:44.662	f
e1d4e2a1-cbea-43bf-a079-eee60eea017e	mock-nurse-id	DAY	2026-02-19 11:51:32.239	2026-02-24 15:05:27.535	f
06e7c56e-58dd-4d55-b5a5-12d7c166d62e	mock-nurse-id	DAY	2026-02-24 15:05:32.925	\N	t
874117aa-b8fd-4744-8750-972184585646	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	DAY	2026-02-24 16:31:50.944	\N	t
\.


ALTER TABLE public."Shift" ENABLE TRIGGER ALL;

--
-- Data for Name: IntakeOutput; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."IntakeOutput" DISABLE TRIGGER ALL;

COPY public."IntakeOutput" (id, "patientId", "userId", "shiftId", type, category, amount, notes, "timestamp") FROM stdin;
20924178-ed99-4175-afb6-a98fcdd4b4f4	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 11:00:51.913
91aee84d-bf64-42ea-903d-075c5787eb8d	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	400	\N	2026-02-17 11:00:51.913
74b2f12f-c900-47bb-a25d-c292a186bb9e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 15:00:51.913
f6b607aa-3ab0-4d99-92cf-a04332da34b0	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	356	\N	2026-02-17 15:00:51.913
e4ecd213-8161-486a-8eaf-669e1d9de308	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 19:00:51.913
84bd9a96-de5e-4526-835a-2debc6ce56c9	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	423	\N	2026-02-17 19:00:51.913
f1809ee1-db94-42f8-a8cd-d1a4d040945e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-17 23:00:51.913
236d35b1-2354-42a4-be17-83066cf90772	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	315	\N	2026-02-17 23:00:51.913
d28b8b66-f75e-4923-a8ca-d190f1b1e79d	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 03:00:51.913
703f4784-50b1-4575-90eb-514755a46dbe	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	421	\N	2026-02-18 03:00:51.913
49c2f637-8c63-4652-9de0-845b64f83428	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 07:00:51.913
fd55f675-29a9-4860-8057-13da5abd8f9e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	210	\N	2026-02-18 07:00:51.913
57b98a6a-f38c-46be-83e6-797553eafc10	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 11:00:51.913
4d463028-7a09-4c2d-8c70-530651d0711e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	223	\N	2026-02-18 11:00:51.913
75e4145d-bd16-4e10-a746-f4e45f03f10c	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 15:00:51.913
9316cbe4-5c1a-4bcd-8bf3-d446c0aea593	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	204	\N	2026-02-18 15:00:51.913
f9fef10a-1394-44d8-94b0-bc1b9781600e	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 19:00:51.913
2f769459-184b-4ba8-a23a-37f4748a6c88	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	223	\N	2026-02-18 19:00:51.913
5cf373d3-53eb-4e51-85f3-e7408eb2f578	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-18 23:00:51.913
8465de38-f8ac-450a-9869-0672003bf59c	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	210	\N	2026-02-18 23:00:51.913
ed81ec93-9e34-472e-8c09-9509c8a15d91	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-19 03:00:51.913
713d10c9-de47-486f-bb57-badbf9508b6f	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	192	\N	2026-02-19 03:00:51.913
40e754f8-b1ba-46d6-9405-ba14da0e934b	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	INPUT	IV Fluid	500	\N	2026-02-19 07:00:51.913
9239d355-393f-477d-aa31-2d5969046548	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	OUTPUT	Urine	394	\N	2026-02-19 07:00:51.913
\.


ALTER TABLE public."IntakeOutput" ENABLE TRIGGER ALL;

--
-- Data for Name: Investigation; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Investigation" DISABLE TRIGGER ALL;

COPY public."Investigation" (id, "patientId", "orderId", "authorId", type, category, title, status, result, impression, "conductedAt", "createdAt", "externalId") FROM stdin;
ef58d0a5-5888-4ba3-9be2-2b353f77086a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Procalcitonin, Serum	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951015996-37.png", "Procalcitonin, Serum": 7.08}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.78	3120427
d3d9dbc9-5dd3-40e1-ba0b-0720b7c1ed03	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Urea, Serum": "104*", "Creatinine, Serum": "2.59"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.756	3120232
25a47781-f5e8-4100-b5c6-50aea4ba2d51	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Sodium, Serum": "131*", "Potassium, Serum": "3.96"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.771	3120232
b6d8d4e8-e983-4a61-a47d-6fd42db931f7	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120232-1771951038726-318.png", "Albumin, Serum": "2.75*"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.775	3120232
fc2a59b8-993b-4ac5-8d74-331f276f4a2f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Urea, Serum": "119*", "Creatinine, Serum": "3.14"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.907	3120427
7d301d18-dca1-4df8-85fe-e4715b366ca7	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Sodium, Serum": "131*", "Potassium, Serum": "3.99"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.912	3120427
8f122b09-077a-46ff-a0f4-93338513acbe	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-senior-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "8.9", "MCH": "29.5", "MCV": "88.1", "MPV": "9.8", "PCV": "26.6", "RBC": "3.02", "RDW": "17.0", "WBC": "8.0", "MCHC": "33.5", "imageUrl": "/uploads/sync-3119480-1771441400033-619.png", "Platelets": "231"}	Auto-synced from Lab Results	2026-02-18 00:00:00	2026-02-18 19:03:57.191	3119480
ad7a1b02-b12c-46ea-be06-55dbf49a6586	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-senior-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "7.5", "MCH": "29.4", "MCV": "89.8", "MPV": "9.6", "PCV": "22.9", "RBC": "2.55", "RDW": "17.5", "WBC": "5.7", "MCHC": "32.8", "imageUrl": "/uploads/sync-3118913-1771441406300-746.png", "Platelets": "345"}	Auto-synced from Lab Results	2026-02-16 00:00:00	2026-02-18 19:04:07.85	3118913
a5da3c01-64c5-4db1-b36c-546cbfa48519	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120427-1771951013192-238.png", "Albumin, Serum": "3.02*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.918	3120427
0c407861-9268-4121-bbfb-ddd0d6914442	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Procalcitonin, Serum	FINAL	{"imageUrl": "/uploads/sync-3120236-1771951638637-578.png", "Procalcitonin, Serum": "0.71"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:24.987	3120236
4aa379c5-cecc-4442-b760-6840069dae27	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function Test	FINAL	{"imageUrl": "/uploads/sync-3120236-1771951641597-967.png", "Urea, Serum": "36", "Sodium, Serum": "137", "Albumin, Serum": "3.26*", "Potassium, Serum": "3.77", "Creatinine, Serum": "1.20"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:25.261	3120236
7b442130-78b9-4175-ae9c-2d66ef5d7476	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.7", "MCH": "30.6", "MCV": "91.2", "MPV": "11.2*", "PCV": "*25.9", "RBC": "*2.84", "RDW": "13.6", "MCHC": "33.6", "imageUrl": "/uploads/sync-3120420-1771951632625-905.png", "Platelets": "203"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:25.573	3120420
2621cc20-dfd3-4fb0-a790-7a47c32888cb	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*11.0", "MCH": "28.3", "MCV": "85.1", "MPV": "8.9", "PCV": "*33.1", "RBC": "3.89", "RDW": "15.5*", "MCHC": "33.2", "imageUrl": "/uploads/sync-3120431-1771951740170-195.png", "Platelets": "326"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:06.86	3120431
1afd4f35-eb13-4362-b6bc-d85404806193	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120431-1771951743382-587.png", "Urea, Serum": "53*", "Creatinine, Serum": "0.50"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:07.069	3120431
61034f82-fdd8-418d-b5ac-8bd81525d5e2	4f8820ab-0ca8-4844-9f44-51a795c334ae	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120431-1771951743382-587.png", "Sodium, Serum": "137", "Chloride, Serum": "102", "Potassium, Serum": "4.19"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:49:07.083	3120431
7511c908-27ec-4e26-8f02-9dd112ad1236	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Coagulation	Prothrombin Time	FINAL	{"INR": "1.70", "imageUrl": "/uploads/sync-3120381-1771959707232-534.png", "Prothrombin Time": "23.6*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 19:01:52.266	3120381
9b4020ef-1e3b-47f9-b8f1-21cbb1ab4938	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Coagulation	Partial Thromboplastin Time (PTT)	FINAL	{"PTT": "69.5*", "imageUrl": "/uploads/sync-3120381-1771959707232-534.png"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 19:01:52.285	3120381
3db34b4a-c4a4-4c84-a701-959759fe7a0d	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120428-1771959700626-586.png", "Urea, Serum": "62*", "Creatinine, Serum": "1.43"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:01:52.694	3120428
1f790639-289a-4119-8842-253e3ded7e41	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120428-1771959700626-586.png", "Sodium, Serum": "139", "Chloride, Serum": "101", "Potassium, Serum": "3.09*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:01:52.718	3120428
b51977f6-2d5c-4554-a2b6-12a5f12da396	68baae90-91be-4b76-9d3b-7e5e423a0523	\N	mock-nurse-id	LAB	Hematology	Coagulation	FINAL	{"INR": "1.59", "PTT": "43.6*", "imageUrl": "/uploads/sync-3120428-1771959697365-76.png", "Prothrombin Time": "22.1*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 19:02:00.093	3120428
0f26c2a8-da7e-4858-8421-d560c2891f65	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "8.6", "MCH": "28.8", "MCV": "85.3", "MPV": "10.5", "PCV": "25.5", "RBC": "2.99", "RDW": "16.4", "WBC": "3.6", "MCHC": "33.7", "MID %": "4.50", "imageUrl": "/uploads/import-1771950952623.png", "MID %/cmm": "0.20", "Platelets": "30", "Lymphocytes": "13.3", "Neutrophils": "82.2", "Lymphocytes/cmm": "0.48", "Neutrophils/cmm": "2.96"}	Imported from Lab Results	2026-01-02 09:44:00	2026-02-24 16:35:57.035	\N
a2957913-1016-4e6f-bb81-03b887ab62e1	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Serology	C-Reactive Protein, Serum	FINAL	{"imageUrl": "/uploads/sync-3120268-1771951032976-972.png", "C-Reactive Protein, Serum": "156.00*"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.797	3120268
7ad4a684-3efe-4e26-86ec-1097b51048f6	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Pleural Fluid Analysis	FINAL	{"imageUrl": "/uploads/sync-3120398-1771951018641-126.png", "Protein, Pleural fluid": 1.9, "Lactate Dehydrogenase (LDH), Pleural fluid": 388}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.828	3120398
688ea102-6e45-4910-8fe3-e7d2aa6eef5b	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	\N	mock-nurse-id	LAB	Hematology	COMPLETE BLOOD COUNT	FINAL	{"Hb": "10.1", "MCH": "29.5", "MCV": "90.4", "MPV": "9.4", "PCV": "30.9", "RBC": "3.42", "RDW": "16.0", "MCHC": "32.7", "imageUrl": "/uploads/sync-3120091-1771885824275-364.png", "Platelets": "262"}	Auto-synced from Lab Results	2026-02-22 00:00:00	2026-02-23 22:30:38.744	3120091
1905cb1e-ce44-45c5-8f7d-3ac29da55379	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.30", "PTT": "61.4*", "imageUrl": "/uploads/sync-3120232-1771951041537-223.png", "Prothrombin Time": "18.4*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.833	3120232
23ea43e4-145b-4347-b761-ba182e94a571	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.19", "PTT": "34.6", "imageUrl": "/uploads/sync-3120378-1771951029861-989.png", "Prothrombin Time": "17.0*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:24.886	3120378
7b2ca586-225f-4b4a-b3f5-ebc1be07933c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Coagulation	FINAL	{"INR": "1.32", "PTT": "57.9*", "imageUrl": "/uploads/sync-3120427-1771951008693-32.png", "Prothrombin Time": "18.7*", "Normal Control Plasma": "14.5"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:24.89	3120427
cb8b31df-66c3-4bb5-b6ae-99548c0c7f0c	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	Differential count	FINAL	{"Gross": "Bloody", "Specimen": "Pleural Fluid", "imageUrl": "/uploads/sync-3120398-1771951021642-928.png", "Neutrophils": "80", "Total Cell Count": "300.0(many RBC seen/cut.)m"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.194	3120398
fa05e9c4-cecf-4d3c-86ec-f8b695a32ccd	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.6", "MCH": "28.8", "MCV": "85.3", "MPV": "10.5", "PCV": "*25.5", "RBC": "*2.99", "RDW": "16.4*", "MCHC": "33.7", "imageUrl": "/uploads/sync-3120427-1771951005673-851.png", "Platelets": "*30"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:37:25.293	3120427
b3d8030e-9b03-43d5-8025-8db54863ac7f	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*7.7", "MCH": "28.5", "MCV": "85.2", "MPV": "8.8", "PCV": "*23.0", "RBC": "*2.70", "RDW": "16.8*", "MCHC": "33.5", "imageUrl": "/uploads/sync-3120378-1771951026819-890.png", "Platelets": "*46"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.351	3120378
da42e3e9-a6ab-4e59-91d6-47782a30459a	38b62b34-4f1f-496f-974c-fb8fc34d934b	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*7.9", "MCH": "28.2", "MCV": "84.3", "MPV": "9.5", "PCV": "*23.6", "RBC": "*2.80", "RDW": "16.5*", "MCHC": "33.5", "imageUrl": "/uploads/sync-3120232-1771951035804-638.png", "Platelets": "*34"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:37:25.755	3120232
eb112e65-f10f-4ec5-8658-b6c4ce829582	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Hematology	CBC	FINAL	{"Hb": "*8.7", "MCH": "30.1", "MCV": "92.4", "MPV": "10.7", "PCV": "*26.7", "RBC": "*2.89", "RDW": "13.5", "MCHC": "32.6", "imageUrl": "/uploads/sync-3120236-1771951635585-902.png", "Platelets": "224"}	Auto-synced from Lab Results	2026-02-23 00:00:00	2026-02-24 16:47:25.572	3120236
a6028d29-81ce-49b8-b17f-ab7f96221e6f	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Renal Function	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Urea, Serum": 38, "Creatinine, Serum": 1.23}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.361	3120420
aad2f094-d0cf-4941-94f6-a6735698ef42	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Electrolytes	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Sodium, Serum": 137, "Potassium, Serum": 3.81}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.368	3120420
b9b9f25b-0731-4315-a22a-3765494e664c	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	\N	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	LAB	Biochemistry	Albumin	FINAL	{"imageUrl": "/uploads/sync-3120420-1771951629454-442.png", "Albumin, Serum": "2.90*"}	Auto-synced from Lab Results	2026-02-24 00:00:00	2026-02-24 16:47:26.375	3120420
\.


ALTER TABLE public."Investigation" ENABLE TRIGGER ALL;

--
-- Data for Name: Medication; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."Medication" DISABLE TRIGGER ALL;

COPY public."Medication" (id, name, "defaultDose", route, frequency, "infusionRate", "otherInstructions", "patientId", "isActive", "startedAt") FROM stdin;
0bf770fe-df52-409c-9d39-24c914cfee63	Paracetamol	1g	PO	Q6H	\N	\N	4f8820ab-0ca8-4844-9f44-51a795c334ae	t	2026-02-24 18:59:08.248
8516b6b1-7188-4fa2-90fd-bee173714fb3	Ceftriaxone	2g	IV	OD	\N	\N	4f8820ab-0ca8-4844-9f44-51a795c334ae	t	2026-02-24 18:59:08.248
8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Furosemide	40mg	IV	BD	\N	\N	4f8820ab-0ca8-4844-9f44-51a795c334ae	t	2026-02-24 18:59:08.248
2664dcc9-d3c1-47be-a42e-b0064a01fb9a	B-Core	2.5	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
618650f7-19c4-4896-bf5c-b22d15bed3c7	sevelamer	800	PO	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
04cc58e8-dc20-4687-a803-939175a40747	alpha one 	20	PO	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
5cc824b6-cbb5-4bb9-b895-4a73f7337caa	keppra vial	500	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
8f9bc1b1-bcc6-4cac-837a-be67c4af6608	ca carbonate	500	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
71cabdcc-c386-417b-a22d-d5c5cabbfcfd	tegretol tab 	200	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
63b5545b-fb41-423e-9278-228347b0ca98	GS + NS	80	IV	OD (Once Daily)	80		68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
25a9dfb2-5b94-41d7-9789-03e2ebba28fa	Paracetamol	1 g	IV	TDS (Thrice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
8eaef7b6-d28f-4c28-8243-1b203403a86d	Pantoprazole	40 mg	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
fb76b828-2157-4deb-ad5c-998a929bdd4a	Albumin 20%	20%	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
bde673ee-cf6a-48be-80e0-6d42fd3b2010	L - Carintine 	3cc	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
f6823bd8-55b4-461e-ac0c-a6310c7d96e0	Caspofungin	50	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
30130a49-2715-4eff-af11-fdb452d9ade0	Vancomycin	1 g	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
496ac8a8-a1d9-4723-b837-fe68c3c6fdf9	Ciprofloxacine	200	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
f6580996-85a5-4903-a0c2-8d58d08089cc	Ipratropium Bromide 	neb	NEB	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
8f44f3ad-eaa9-4312-adf8-a98ad4d631e3	NACl 3%	Neb	NEB	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
d933a885-f9f3-4a0c-b85d-ff4de2f32e31	Eye drop	lub	NEB	6x/Day (Q4H)		قطرات عين ترطيب	68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:08.248
e815b46a-a6d9-4e54-88c7-8db86d6bb3e6	Solvodin	amp	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:12.333
f3f10783-ba2b-46df-9cee-82600cb4caf0	fusidine 	oint	IV	6x/Day (Q4H)		تدهن اليدين باستمرار كلما جفت	68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 18:59:40.141
609d42e4-28fe-41e9-8b8a-6661bee1544e	Assist 	Neb	NEB	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 19:00:12.14
84c649a6-17b7-4bd7-90f8-7c4b6d43e85f	Hydrocortisone	100 mg	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 19:00:27.812
0b2e0767-0143-4f05-a168-91141ec4bb18	Meropenem	1 g	IV	BD (Twice Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 19:00:40.139
6da92a5e-4c2a-421a-9179-2878a7a0959d	lasix 	10mg/hr	IV	OD (Once Daily)			68baae90-91be-4b76-9d3b-7e5e423a0523	t	2026-02-24 19:01:15.027
\.


ALTER TABLE public."Medication" ENABLE TRIGGER ALL;

--
-- Data for Name: MedicationAdministration; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."MedicationAdministration" DISABLE TRIGGER ALL;

COPY public."MedicationAdministration" (id, "patientId", "medicationId", status, dose, "timestamp", "userId") FROM stdin;
795395a7-0097-4f09-9c47-7650d4b1e9b7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 11:00:51.913	mock-nurse-id
d0ee82dc-fb77-4907-a8b5-4edbcccd6bb2	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 17:00:51.913	mock-nurse-id
61875330-2e4a-4ba3-b98f-c833dc5260d3	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-17 23:00:51.913	mock-nurse-id
3ebed734-e91e-4cd3-a0f8-d606e4d132a7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 05:00:51.913	mock-nurse-id
7c2af7ef-e464-4258-a69f-6648deb8c633	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 11:00:51.913	mock-nurse-id
e5b755d3-723d-453a-ba6e-1ef35263709f	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 17:00:51.913	mock-nurse-id
eec558c5-8709-4101-82d2-29c3bc933aa7	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-18 23:00:51.913	mock-nurse-id
b9c57a35-561d-44dc-ab25-c0dff97504fc	4f8820ab-0ca8-4844-9f44-51a795c334ae	0bf770fe-df52-409c-9d39-24c914cfee63	Given	1g	2026-02-19 05:00:51.913	mock-nurse-id
1324b049-4914-43b7-9041-b2f13eebb43d	4f8820ab-0ca8-4844-9f44-51a795c334ae	8516b6b1-7188-4fa2-90fd-bee173714fb3	Given	2g	2026-02-17 12:00:51.913	mock-nurse-id
87e941c5-7399-4100-9d1a-340c8c96d2e7	4f8820ab-0ca8-4844-9f44-51a795c334ae	8516b6b1-7188-4fa2-90fd-bee173714fb3	Given	2g	2026-02-18 12:00:51.913	mock-nurse-id
28281ef8-de76-442d-8d77-29d7fa1d6955	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-17 13:00:51.913	mock-nurse-id
73e28902-c500-4ab4-af3a-aa56aa5515cb	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-18 01:00:51.913	mock-nurse-id
b0036c56-54f3-47dc-a84a-4f6f033cc2df	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-18 13:00:51.913	mock-nurse-id
54f2b689-129a-4f52-a28f-238de3b75cc5	4f8820ab-0ca8-4844-9f44-51a795c334ae	8d46c93c-1c78-46ff-b2ec-315f2bca47eb	Given	40mg	2026-02-19 01:00:51.913	mock-nurse-id
\.


ALTER TABLE public."MedicationAdministration" ENABLE TRIGGER ALL;

--
-- Data for Name: NurseCheckIn; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."NurseCheckIn" DISABLE TRIGGER ALL;

COPY public."NurseCheckIn" (id, "patientId", "userId", "shiftId", "airwaySafe", "breathingOk", "circulationOk", notes, "timestamp") FROM stdin;
acaf2926-6eec-4b65-90bc-4e79bc5a5f63	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	mock-nurse-id	393dc091-8f77-48c4-8592-66d6dfe727f6	t	t	t		2026-02-19 09:32:11.957
\.


ALTER TABLE public."NurseCheckIn" ENABLE TRIGGER ALL;

--
-- Data for Name: PatientAssignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."PatientAssignment" DISABLE TRIGGER ALL;

COPY public."PatientAssignment" (id, "patientId", "userId", "shiftId", "isActive", "createdAt", "endedAt") FROM stdin;
e797b507-204f-4b89-9554-471a907fd11b	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-nurse-id	\N	f	2026-02-18 18:33:54.305	2026-02-18 18:36:17.758
971468e7-eb19-42f7-bbb4-8b53372e08b3	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-nurse-id	\N	f	2026-02-18 18:36:18.675	2026-02-18 18:36:19.786
95138858-8c43-4e55-acd9-3315c278a3b4	38b62b34-4f1f-496f-974c-fb8fc34d934b	028720b6-9103-4f9c-b6d7-c5dbffaae67b	\N	t	2026-02-19 08:45:06.026	\N
5d1d0cc6-1380-46f6-a713-5001dd231d6c	ac2b8db5-9e74-4fd9-a21f-0daace86fdd9	5c9cb127-d961-4f7a-a714-ac58833eaef3	\N	t	2026-02-19 08:48:27.114	\N
8844ca3c-d0f7-40b6-ac61-889076af466c	38b62b34-4f1f-496f-974c-fb8fc34d934b	mock-nurse-id	\N	f	2026-02-18 18:36:23.042	2026-02-19 09:21:44.908
9caadd55-c51d-4441-ac14-c03385690e67	f14786fc-e0a2-44b9-bbd1-b88d7af18ac4	55e877af-275d-4635-bf21-d2b5587de171	\N	t	2026-02-19 09:27:31.842	\N
800a4e2d-156f-483e-acf6-2cb46db5b1ab	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	f	2026-02-19 11:51:35.893	2026-02-19 11:51:38.626
ff9d6138-7dd7-4f34-bba5-32858e24ef05	4f8820ab-0ca8-4844-9f44-51a795c334ae	mock-nurse-id	\N	t	2026-02-24 12:30:11.319	\N
e0b5c543-3625-400d-98d1-2fd4bb1d1703	38b62b34-4f1f-496f-974c-fb8fc34d934b	9bad4737-5fda-4622-a6bd-5c65e7bfb1ea	\N	t	2026-02-24 16:31:35.098	\N
\.


ALTER TABLE public."PatientAssignment" ENABLE TRIGGER ALL;

--
-- Data for Name: SpecialistNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."SpecialistNote" DISABLE TRIGGER ALL;

COPY public."SpecialistNote" (id, "patientId", "authorId", date, "apacheScore", "histHT", "histDM", "histAsthma", "histCOPD", "histIHD", "histStroke", "histOther", "neuroGCS", "neuroRASS", "respChest", "respRoomAir", "respO2Therapy", "respVentMode", "respVentModeText", "respFio2", "respPS", "intCVLine", "intArtLine", "intETT", "intTrach", "intDoubleLumen", "hydNormovolemia", "hydHypervolemia", "hydHypovolemia", "hydUOP", "hydIVC", "hydCVP", "hemoStable", "hemoUnstable", "hemoVasopressor", "feedOral", "feedNG", "feedTPN", "feedRate", "ivFluidsRate", "sedPropofol", "sedKetamine", "sedMidazolam", "sedRemif", "sedMR", "sedOther", "clinicalNotes", "planVentilatory", "planPhysio", "planConsult", "planInvestigation", "planOther", "planFuture", "planHomeTeam", "createdAt", "updatedAt", "shiftType") FROM stdin;
44625af3-6f24-495e-b844-bb7eae0962b8	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	2026-02-24 00:00:00		t	f	f	f	f	f	CKD				f	f	f				f	f	f	f	f	f	f	f				f	f	f	f	f	f			f	f	f	f	f										2026-02-24 17:43:52.106	2026-02-24 17:43:52.106	Day
18aa82ca-e4c2-40e7-b775-550c619f943a	68baae90-91be-4b76-9d3b-7e5e423a0523	mock-senior-id	2026-02-24 00:00:00		t	f	f	f	f	f	CKD	E4V1M4			f	f	t	PS	40	10	t	t	f	t	f	t	f	f	100	2.2		t	f	f	f	f	f	feeding stopped	100	f	f	f	f	f				nurse called fromt the ward by request of the relative	hasan aldabagh for ptt 67	baseline + crp	consultation to hasan aldabagh ptt 67	monitor IVC regulary		2026-02-24 17:45:47.664	2026-02-24 17:45:47.664	Day
\.


ALTER TABLE public."SpecialistNote" ENABLE TRIGGER ALL;

--
-- Data for Name: VitalSign; Type: TABLE DATA; Schema: public; Owner: postgres
--

ALTER TABLE public."VitalSign" DISABLE TRIGGER ALL;

COPY public."VitalSign" (id, "patientId", "heartRate", "bpSys", "bpDia", spo2, temp, rbs, "timestamp") FROM stdin;
ab9044b0-cff1-459b-84bf-ca11641479fe	68baae90-91be-4b76-9d3b-7e5e423a0523	57	138	62	99	35.9	110	2026-02-24 17:54:53.587
fc8eb844-a76b-483b-97c5-90a5f5999974	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	117	60	95	37	105	2026-02-17 11:00:51.913
7f343558-1758-47b2-a372-de7d51f83936	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	126	79	96	36.9	\N	2026-02-17 12:00:51.913
813806ce-9d15-46b6-b601-cbc6106ea2c1	4f8820ab-0ca8-4844-9f44-51a795c334ae	70	136	78	98	37.8	\N	2026-02-17 13:00:51.913
64e7d382-5efc-469f-94b2-21df98350c29	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	131	74	96	36.5	\N	2026-02-17 14:00:51.913
a1d54ed8-e024-479f-9904-8b65b03ff2fa	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	113	67	96	37.2	125	2026-02-17 15:00:51.913
69570cdd-1f1a-4fce-a7b4-fc49c37eb934	4f8820ab-0ca8-4844-9f44-51a795c334ae	89	133	65	95	37.7	\N	2026-02-17 16:00:51.913
9da5ec72-949e-45e8-a8d3-9cce1864fc35	4f8820ab-0ca8-4844-9f44-51a795c334ae	93	118	79	95	36.8	\N	2026-02-17 17:00:51.913
bcd6a0e2-2e21-413c-a245-5a4cf88edc44	4f8820ab-0ca8-4844-9f44-51a795c334ae	61	137	75	98	36.6	\N	2026-02-17 18:00:51.913
7fc9df36-9a1c-49e7-80b2-43c176d026fe	4f8820ab-0ca8-4844-9f44-51a795c334ae	88	125	69	95	37.2	98	2026-02-17 19:00:51.913
9fcaedca-84fe-45f2-8f3e-09c96e027430	4f8820ab-0ca8-4844-9f44-51a795c334ae	85	138	77	98	37.2	\N	2026-02-17 20:00:51.913
84291e54-5777-42ba-a5ff-0bf01586fc4a	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	131	78	94	36.9	\N	2026-02-17 21:00:51.913
3be89f32-8a78-439a-b0b5-562db83cdd15	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	133	65	98	37.8	\N	2026-02-17 22:00:51.913
09f25244-860a-47ee-91a2-e8f8aaf6f445	4f8820ab-0ca8-4844-9f44-51a795c334ae	60	117	66	99	37.5	80	2026-02-17 23:00:51.913
c9842e02-3c19-4143-b24a-c510a5faf652	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	133	77	99	37.8	\N	2026-02-18 00:00:51.913
ffa87918-a9b7-4b45-9296-061481409fd6	4f8820ab-0ca8-4844-9f44-51a795c334ae	72	114	73	94	37.6	\N	2026-02-18 01:00:51.913
5b4f1f4e-5684-4f2c-926b-035a7efec03e	4f8820ab-0ca8-4844-9f44-51a795c334ae	95	139	76	98	37.3	\N	2026-02-18 02:00:51.913
d07252e9-7cb0-48b7-a223-554851dbc27a	4f8820ab-0ca8-4844-9f44-51a795c334ae	70	113	75	99	36.9	134	2026-02-18 03:00:51.913
46932648-a5ee-44ee-bb1e-9d55ce0b9fce	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	118	78	95	37.3	\N	2026-02-18 04:00:51.913
7fec3b12-b0e5-452d-a618-74f4e45070b5	4f8820ab-0ca8-4844-9f44-51a795c334ae	84	118	70	97	37.8	\N	2026-02-18 05:00:51.913
27bd6ee4-5ae9-4963-ace1-60500e53849a	4f8820ab-0ca8-4844-9f44-51a795c334ae	80	117	72	96	38	\N	2026-02-18 06:00:51.913
1d6ce2ff-c95c-40e6-9106-1305f25e0f19	4f8820ab-0ca8-4844-9f44-51a795c334ae	61	120	74	94	37	139	2026-02-18 07:00:51.913
cc176e08-bf60-4abf-a490-6daed21595fa	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	118	66	95	36.5	\N	2026-02-18 08:00:51.913
2c79a2fa-fe13-46f3-bc4e-eef875399a85	4f8820ab-0ca8-4844-9f44-51a795c334ae	82	135	67	95	36.7	\N	2026-02-18 09:00:51.913
e27e99f1-930b-4877-b8ad-47d61efde5c3	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	118	60	98	37.9	\N	2026-02-18 10:00:51.913
6735c015-3646-42c5-a971-bcf042a9b183	4f8820ab-0ca8-4844-9f44-51a795c334ae	74	125	75	96	37.4	131	2026-02-18 11:00:51.913
c9100739-70d3-498c-9cff-43c8a0cf73fe	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	116	72	96	36.9	\N	2026-02-18 12:00:51.913
7470185a-cd72-4aa0-bfd3-697246a26b09	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	128	76	97	37.1	\N	2026-02-18 13:00:51.913
2beee937-0958-4025-a3fa-5e677d62277e	4f8820ab-0ca8-4844-9f44-51a795c334ae	93	128	74	99	37.6	\N	2026-02-18 14:00:51.913
89a7c151-2a82-464b-a102-ecda679f50a7	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	130	70	98	37.7	95	2026-02-18 15:00:51.913
019ea3bd-427c-4d15-a908-0ae9374429e4	4f8820ab-0ca8-4844-9f44-51a795c334ae	96	129	72	96	38	\N	2026-02-18 16:00:51.913
8d807900-e572-4ac3-9731-7170087939ae	4f8820ab-0ca8-4844-9f44-51a795c334ae	80	137	64	96	37.3	\N	2026-02-18 17:00:51.913
ba08963e-6d80-4e50-8929-a4a077f6dda3	4f8820ab-0ca8-4844-9f44-51a795c334ae	73	117	73	98	37.1	\N	2026-02-18 18:00:51.913
96c40479-a383-4b46-8b80-2ad56f26c69e	4f8820ab-0ca8-4844-9f44-51a795c334ae	81	136	63	95	37.4	117	2026-02-18 19:00:51.913
93e47643-6b54-4f3d-9014-ee20f032d510	4f8820ab-0ca8-4844-9f44-51a795c334ae	83	119	74	97	36.8	\N	2026-02-18 20:00:51.913
0c9a04da-eed2-4ac2-a810-bebd8c1d6bb8	4f8820ab-0ca8-4844-9f44-51a795c334ae	90	131	60	95	38	\N	2026-02-18 21:00:51.913
a82e49a1-2c5a-4f8a-a78a-c90fa0abfe7d	4f8820ab-0ca8-4844-9f44-51a795c334ae	91	114	69	99	36.6	\N	2026-02-18 22:00:51.913
411937eb-059b-4617-96ea-f305f48327aa	4f8820ab-0ca8-4844-9f44-51a795c334ae	79	122	65	96	37.7	115	2026-02-18 23:00:51.913
fccbaa7e-6585-42cb-a8b3-4f4cd0f33089	4f8820ab-0ca8-4844-9f44-51a795c334ae	77	121	62	99	37.9	\N	2026-02-19 00:00:51.913
65cbfea1-ae9f-4b68-b83f-3400b0e79a87	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	111	73	99	37.1	\N	2026-02-19 01:00:51.913
674fd3f4-846e-4d02-84a4-0a7001fc993b	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	131	60	98	37.9	\N	2026-02-19 02:00:51.913
0bc049d3-3362-4121-9130-a934d382d6f2	4f8820ab-0ca8-4844-9f44-51a795c334ae	86	119	65	97	37.9	104	2026-02-19 03:00:51.913
56f46c91-c3aa-45aa-893f-9e96b963f842	4f8820ab-0ca8-4844-9f44-51a795c334ae	87	128	70	94	37	\N	2026-02-19 04:00:51.913
56726036-f1bc-499b-9d03-c74ad2ef3898	4f8820ab-0ca8-4844-9f44-51a795c334ae	83	114	67	99	36.7	\N	2026-02-19 05:00:51.913
9828245d-4525-4f5c-a208-dc72fcfa585d	4f8820ab-0ca8-4844-9f44-51a795c334ae	65	128	60	96	37.4	\N	2026-02-19 06:00:51.913
5de15164-7faf-45a8-aa5d-8b358bd905ec	4f8820ab-0ca8-4844-9f44-51a795c334ae	65	128	64	98	36.9	98	2026-02-19 07:00:51.913
f61a67b8-eedf-48bc-ad22-a668135fad3d	4f8820ab-0ca8-4844-9f44-51a795c334ae	75	137	77	97	37.1	\N	2026-02-19 08:00:51.913
90acdfc2-aafa-475b-bd75-ec62280bb562	4f8820ab-0ca8-4844-9f44-51a795c334ae	99	117	70	95	36.7	\N	2026-02-19 09:00:51.913
c6e6e4aa-cbc0-4a04-9131-2aa580b8d1f2	4f8820ab-0ca8-4844-9f44-51a795c334ae	98	133	68	99	36.9	\N	2026-02-19 10:00:51.913
\.


ALTER TABLE public."VitalSign" ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict N4LAdbdJNi3NvDyYjtGgwJaDzKzr3jSdmtkO97eSKGCQ4UfnBnrZtQmG57OrcBT

