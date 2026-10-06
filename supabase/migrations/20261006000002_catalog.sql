-- =============================================================================
-- UniSolve · 0002 · Catalog (categories, skills) and platform settings
-- Reference data below is required in every environment (not demo data).
-- =============================================================================

create table public.categories (
  id            smallserial primary key,
  slug          text not null unique,
  name          text not null,
  description   text,
  base_price    integer not null check (base_price >= 0),   -- rupees, "starting from"
  typical_days  smallint not null default 3,
  sort_order    smallint not null default 0,
  is_active     boolean not null default true
);

-- "What are you working on?" options from the Post Your Problem flow. Each maps
-- to a default category the classifier can override from the description.
create table public.work_types (
  slug              text primary key,
  label             text not null,
  default_category  smallint not null references public.categories (id),
  sort_order        smallint not null default 0
);

create table public.skills (
  id           serial primary key,
  slug         text not null unique,
  name         text not null,
  category_id  smallint references public.categories (id) on delete set null,
  keywords     text[] not null default '{}'  -- lower-case phrases matched against request text
);
create index skills_category_idx on public.skills (category_id);
create index skills_keywords_idx on public.skills using gin (keywords);

-- Single-row settings table, editable by admins only.
create table public.platform_settings (
  id                      boolean primary key default true check (id),
  upi_id                  text,
  upi_payee_name          text,
  upi_qr_path             text,          -- object path in the public 'platform' bucket
  commission_percent      numeric(5,2) not null default 20 check (commission_percent between 0 and 100),
  referral_reward         integer not null default 100 check (referral_reward >= 0),  -- rupees
  referral_enabled        boolean not null default true,
  milestone_split         smallint[] not null default '{30,40,30}',
  milestone_threshold     integer not null default 2500,   -- quotes >= this use milestones
  file_retention_days     integer not null default 180 check (file_retention_days >= 7),
  max_upload_mb           integer not null default 25,
  public_stats_threshold  integer not null default 25,     -- show public metrics once completed >= this
  updated_at              timestamptz not null default now()
);
insert into public.platform_settings default values;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, description, base_price, typical_days, sort_order) values
  ('academic', 'Academic Support',    'Tutoring, concepts, problem solving and exam preparation', 199, 2, 1),
  ('coding',   'Coding & Technology', 'Programming help, debugging and technology guidance',     199, 2, 2),
  ('ai-ml',    'AI/ML',               'Machine learning, deep learning and data science',        999, 5, 3),
  ('projects', 'Projects',            'Project mentorship from ideation to presentation',        999, 7, 4),
  ('research', 'Research',            'Methodology, analysis, literature and LaTeX support',    1499, 7, 5),
  ('thesis',   'Thesis Support',      'Thesis mentorship from topic to viva',                   2999, 14, 6),
  ('presentation', 'Presentation & Viva', 'Slides, presentation coaching and viva preparation',  499, 3, 7),
  ('career',   'Career',              'Resume, portfolio, interviews and career guidance',       499, 3, 8);

insert into public.work_types (slug, label, default_category, sort_order)
select v.slug, v.label, c.id, v.ord from (values
  ('assignment',   'Assignment',    'academic',     1),
  ('coding',       'Coding',        'coding',       2),
  ('project',      'Project',       'projects',     3),
  ('research',     'Research',      'research',     4),
  ('thesis',       'Thesis',        'thesis',       5),
  ('presentation', 'Presentation',  'presentation', 6),
  ('exam',         'Exam',          'academic',     7),
  ('career',       'Resume/Career', 'career',       8),
  ('other',        'Other',         'academic',     9)
) as v(slug, label, cat, ord) join public.categories c on c.slug = v.cat;

insert into public.skills (slug, name, category_id, keywords)
select v.slug, v.name, c.id, v.kw from (values
  ('python',        'Python',            'coding',   array['python','pandas','numpy','django','flask','pip ','jupyter']),
  ('java',          'Java',              'coding',   array['java ','java,','spring','maven','jvm']),
  ('c-cpp',         'C/C++',             'coding',   array['c++','cpp',' c program','segmentation fault','pointer']),
  ('javascript',    'JavaScript',        'coding',   array['javascript',' js ','node','typescript','express']),
  ('react',         'React',             'coding',   array['react','next.js','nextjs','redux','jsx']),
  ('sql',           'SQL & Databases',   'coding',   array['sql','mysql','postgres','dbms','database','query','mongodb']),
  ('matlab',        'MATLAB',            'coding',   array['matlab','simulink']),
  ('cloud',         'Cloud',             'coding',   array['aws','azure','gcp','cloud','docker','kubernetes']),
  ('cybersecurity', 'Cybersecurity',     'coding',   array['security','cyber','network security','cryptography','ctf']),
  ('dsa',           'Data Structures & Algorithms', 'coding', array['dsa','algorithm','data structure','leetcode','linked list','dynamic programming']),
  ('web-dev',       'Web Development',   'coding',   array['website','html','css','web app','frontend','backend','mern']),
  ('android',       'Mobile Development','coding',   array['android','flutter','kotlin','ios','mobile app']),
  ('ml',            'Machine Learning',  'ai-ml',    array['machine learning',' ml ','ml project','scikit','sklearn','regression','classification','random forest']),
  ('deep-learning', 'Deep Learning',     'ai-ml',    array['deep learning','neural network','cnn','rnn','lstm','transformer']),
  ('pytorch',       'PyTorch',           'ai-ml',    array['pytorch','torch']),
  ('tensorflow',    'TensorFlow',        'ai-ml',    array['tensorflow','keras']),
  ('computer-vision','Computer Vision',  'ai-ml',    array['computer vision','image classification','object detection','opencv','yolo','image']),
  ('nlp',           'NLP',               'ai-ml',    array['nlp','natural language','sentiment','bert','llm','text classification','chatbot']),
  ('data-science',  'Data Science',      'ai-ml',    array['data science','data analysis','visualization','eda','power bi','tableau']),
  ('statistics',    'Statistics',        'research', array['statistics','spss','anova','t-test','hypothesis','regression analysis',' r ']),
  ('literature-review','Literature Review','research',array['literature review','related work','survey paper']),
  ('methodology',   'Research Methodology','research',array['methodology','research design','questionnaire','sampling']),
  ('latex',         'LaTeX',             'research', array['latex','overleaf','bibtex']),
  ('citations',     'Citation Management','research',array['citation','references','zotero','mendeley','apa','ieee format']),
  ('paper-reading', 'Paper Understanding','research',array['research paper','understand this paper','paper explanation']),
  ('thesis-writing','Thesis Mentorship', 'thesis',   array['thesis','dissertation','chapter']),
  ('viva',          'Viva Preparation',  'presentation', array['viva','defense','defence','oral exam']),
  ('presentation',  'Presentation Design','presentation', array['presentation','slides','ppt','powerpoint','pitch']),
  ('proofreading',  'Proofreading',      'thesis',   array['proofread','grammar','formatting','editing']),
  ('mathematics',   'Mathematics',       'academic', array['math','calculus','linear algebra','probability','differential','laplace','matrix']),
  ('physics',       'Physics',           'academic', array['physics','mechanics','thermodynamics','electromagnet']),
  ('electronics',   'Electronics',       'academic', array['electronics','circuit','vlsi','embedded','arduino','iot','microcontroller','signal processing']),
  ('mechanical',    'Mechanical Engg.',  'academic', array['mechanical','cad','solidworks','ansys','autocad','fluid']),
  ('management',    'Management',        'academic', array['management','marketing','finance','mba','accounting','economics','case study']),
  ('resume',        'Resume & LinkedIn', 'career',   array['resume','cv','linkedin','portfolio']),
  ('interview',     'Interview Prep',    'career',   array['interview','placement','mock','hr round','aptitude'])
) as v(slug, name, cat, kw) join public.categories c on c.slug = v.cat;
