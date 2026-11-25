import { Stage } from '@/stageshow/kit/stage';
import type { Act } from '@/stageshow/kit/act';
import { Notification, Phone } from '@/stageshow/kit/phone';
import { Bar } from '@/stageshow/kit/window';
import { Avatar } from '@/stageshow/kit/parts/Avatar';
import { Meter } from '@/stageshow/kit/parts/Meter';
import { Collapse } from '@/stageshow/kit/motion/Collapse';
import { Count } from '@/stageshow/kit/motion/Count';
import { States } from '@/stageshow/kit/motion/States';
import './trip-demo.css';

/*
 * Landing hero demo, built with the stageshow kit (benjitaylor/skills).
 *
 * Story, played once when in view: a provider's trip shows 15 kg left (context).
 * A request notification drops in and lands as a row; the provider taps Terima
 * (action); the kilos roll down to 11 and the meter fills, then the handover
 * receipt arrives beside the phone with the bill marked Lunas (payoff).
 *
 * Real strings: Trip saya, RUH → CGK, Sisa, kg, Aisyah, titip 4 kg, Terima /
 * Diterima, Tagihan, Lunas. Everything else is a line.
 */

type S = { notif: boolean; row: boolean; accepted: boolean; kg: number; receipt: boolean };

const START: S = { notif: false, row: false, accepted: false, kg: 15, receipt: false };
const END: S = { notif: false, row: true, accepted: true, kg: 11, receipt: true };
const CAP = 20;

const script = async (a: Act<S>) => {
  await a.wait(900);
  a.mark('request');
  a.put({ notif: true });
  await a.wait(1700);
  a.put({ notif: false, row: true });
  await a.wait(900);
  a.mark('accept');
  await a.click('accept');
  a.put({ accepted: true, kg: 11 });
  await a.wait(1300);
  a.mark('receipt');
  a.put({ receipt: true });
  await a.wait(600);
};

function Plane() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

export function TripDemo({ className }: { className?: string }) {
  return (
    <div className={className} aria-label="Contoh: provider menerima request, sisa bagasi berkurang dari 15 ke 11 kg, lalu tagihan lunas." role="img">
      <Stage<S>
        width={460}
        height={460}
        compact={{ below: 440, width: 358, height: 420 }}
        initial={START}
        poster={END}
        script={script}
        play="once"
        cursor={{ at: { wide: { x: 330, y: 420 }, compact: { x: 300, y: 390 } }, style: 'touch' }}
        className="jc-demo"
        accent="#16b8a6"
      >
        {(s, _rect, layout) => (
          <>
            <Phone width={layout === 'compact' ? 262 : 286} className="jc-demo__phone">
              <div className="jc-app">
                <div className="jc-app__head">
                  <Bar w={84} h={8} r={4} tone={3} />
                  <div className="jc-app__row">
                    <span className="jc-app__title">Trip saya</span>
                    <Avatar name="Ahmad Fauzi" size={38} />
                  </div>
                </div>

                <div className="jc-trip">
                  <div className="jc-trip__top">
                    <span className="jc-trip__type">
                      <Plane /> Bagasi
                    </span>
                    <Bar w={56} h={8} r={4} tone={2} />
                  </div>
                  <div className="jc-trip__route">
                    RUH <span className="jc-trip__arrow">→</span> CGK
                  </div>
                  <div className="jc-trip__kg">
                    <span className="jc-trip__label">Sisa</span>
                    <span className="jc-trip__value">
                      <Count value={s.kg} format={(n) => `${Math.round(n)} kg`} />
                    </span>
                  </div>
                  <Meter value={(CAP - s.kg) / CAP} className="jc-trip__meter" />
                  <div className="jc-trip__foot">
                    <Bar w={92} h={7} r={3} tone={2} />
                    <Bar w={48} h={7} r={3} tone={2} />
                  </div>
                </div>

                <div className="jc-list">
                  <Collapse open={s.row} reveal="drop">
                    <div className="jc-req">
                      <Avatar name="Aisyah Putri" size={40} />
                      <span className="jc-req__text">
                        <span className="jc-req__name">Aisyah</span>
                        <span className="jc-req__sub">titip 4 kg</span>
                      </span>
                      <span className="jc-req__btn" data-target="accept" data-cursor="pointer" data-on={s.accepted || undefined}>
                        <States value={s.accepted ? 'done' : 'ask'} states={{ ask: 'Terima', done: 'Diterima' }} />
                      </span>
                    </div>
                  </Collapse>
                  {[
                    [64, 120],
                    [52, 96],
                  ].map(([a, b], i) => (
                    <div key={i} className="jc-filler">
                      <span className="jc-filler__dot" />
                      <span className="jc-filler__lines">
                        <Bar w={a} h={8} r={4} tone={3} />
                        <Bar w={b} h={7} r={3} tone={2} />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="jc-banner" data-show={s.notif || undefined}>
                  <Notification
                    banner
                    icon={<span className="jc-banner__icon">JC</span>}
                    title="Request baru"
                    body="Aisyah ingin titip 4 kg"
                  />
                </div>
              </div>
            </Phone>

            <div className="jc-receipt" data-show={s.receipt || undefined}>
              <span className="jc-receipt__label">Tagihan</span>
              <span className="jc-receipt__amount">105 SAR</span>
              <span className="jc-receipt__meta">4,2 kg ditimbang</span>
              <span className="jc-receipt__paid">Lunas</span>
            </div>
          </>
        )}
      </Stage>
    </div>
  );
}
