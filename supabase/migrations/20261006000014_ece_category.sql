-- =============================================================================
-- UniSolve · 0014 · ECE: wireless, RF, 5G, embedded & hardware projects
-- Keywords are padded with spaces where short (" rf ", " lte ") because the
-- classifier does substring matching on normalised text.
-- =============================================================================

insert into public.categories (slug, name, description, base_price, typical_days, sort_order)
values ('ece', 'ECE & Embedded', 'Wireless, RF, 5G, signal processing, VLSI and embedded hardware projects', 499, 4, 4)
on conflict (slug) do nothing;

insert into public.work_types (slug, label, default_category, sort_order)
select 'hardware', 'ECE / Hardware', id, 4 from public.categories where slug = 'ece'
on conflict (slug) do nothing;
update public.work_types set sort_order = sort_order + 1 where slug in ('research', 'thesis', 'presentation', 'exam', 'career', 'other');

-- Existing generic electronics skill moves under ECE.
update public.skills set category_id = (select id from public.categories where slug = 'ece')
where slug = 'electronics';

insert into public.skills (slug, name, category_id, keywords)
select v.slug, v.name, c.id, v.kw from (values
  ('wireless-comm', 'Wireless Communications', array['wireless','ofdm','mimo','modulation','qam','fading','path loss','channel model',' ber ','bit error rate','beamforming','cdma','spread spectrum']),
  ('rf-microwave',  'RF & Microwave',          array[' rf ','radio frequency','microwave','smith chart','s-parameter','impedance matching','hfss','cst studio',' ads ','transmission line','waveguide','lna','mixer']),
  ('5g',            '5G / LTE',                array['5g',' nr ','new radio',' lte ','4g','mmwave','mm-wave','massive mimo','3gpp','network slicing']),
  ('antenna',       'Antenna Design',          array['antenna','patch antenna','radiation pattern',' gain ','array antenna','dipole']),
  ('dsp',           'Signal Processing (DSP)', array['dsp','signal processing','fft','filter design',' fir ','iir','sampling','z-transform','fourier']),
  ('vlsi',          'VLSI & FPGA',             array['vlsi','verilog','vhdl','fpga','cadence','asic','rtl','xilinx','vivado']),
  ('embedded',      'Embedded Systems',        array['embedded','arduino','esp32','esp8266','stm32','raspberry pi','8051','microcontroller','firmware','rtos','uart','i2c',' spi ']),
  ('iot-hardware',  'IoT & Hardware Projects', array['iot','sensor','pcb','circuit design','proteus','multisim','hardware project','robot','drone']),
  ('comm-systems',  'Communication Systems',   array['communication system','analog communication','digital communication','amplitude modulation','frequency modulation','pcm','information theory','channel coding'])
) as v(slug, name, kw)
cross join public.categories c where c.slug = 'ece'
on conflict (slug) do nothing;
