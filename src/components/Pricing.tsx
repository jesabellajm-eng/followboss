import { useState, useEffect } from "react";

const FOUNDERS_TOTAL = 100;

export default function Pricing() {
  const [foundersLeft, setFoundersLeft] = useState(87);
  const [trialStarted, setTrialStarted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 14, minutes: 32, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) return prev;
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stripeLinks = {
    mensuel: "https://buy.stripe.com/test_8x2fZib6kbLebGn8ZygMw00",
    fondateurs: "https://buy.stripe.com/test_3cI3cwfmA6qU39R0t2gMw01",
    annuel: "https://buy.stripe.com/test_bJe8wQ3DSdTm8ub2BagMw02",
  };

  const handleCTA = (plan: string) => {
    setSelectedPlan(plan);
    if (plan === "trial") {
      setTrialStarted(true);
    } else if (stripeLinks[plan as keyof typeof stripeLinks]) {
      window.open(stripeLinks[plan as keyof typeof stripeLinks], "_blank");
    }
  };

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header">
        <div className="pricing-badge">Offre de Lancement</div>
        <h1>Choisissez votre plan <span className="gradient-text">FollowBoss</span></h1>
        <p className="pricing-sub">Récupérez des milliers de dollars en devis et factures non payées.<br/>
        <strong>1 relance réussie = l'outil remboursé 10x.</strong></p>
      </div>

      {/* Founders Countdown */}
      <div className="founders-banner">
        <div className="founders-left-col">
          <div className="founders-icon"></div>
          <div>
            <div className="founders-title">Offre Fondateurs — Places Limitées</div>
            <div className="founders-sub">Seulement <strong>{foundersLeft} places restantes</strong> sur {FOUNDERS_TOTAL}</div>
          </div>
        </div>
        <div className="founders-timer">
          {[
            { label: "Jours", value: timeLeft.days },
            { label: "Heures", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Sec", value: timeLeft.seconds },
          ].map(t => (
            <div key={t.label} className="timer-block">
              <div className="timer-num">{String(t.value).padStart(2, "0")}</div>
              <div className="timer-label">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="founders-progress-wrap">
        <div className="founders-progress-bar">
          <div className="founders-progress-fill" style={{ width: `${((FOUNDERS_TOTAL - foundersLeft) / FOUNDERS_TOTAL) * 100}%` }} />
        </div>
        <div className="founders-progress-label">{FOUNDERS_TOTAL - foundersLeft} fondateurs ont déjà rejoint</div>
      </div>

      {/* Plans */}
      <div className="plans-grid">

        {/* Monthly */}
        <div className={`plan-card ${selectedPlan === "monthly" ? "plan-selected" : ""}`}>
          <div className="plan-name">Mensuel</div>
          <div className="plan-price">
            <span className="plan-amount">$19</span>
            <span className="plan-period">/mois</span>
          </div>
          <div className="plan-desc">Idéal pour essayer FollowBoss sans engagement.</div>
          <ul className="plan-features">
            <li>Relances illimitées</li>
            <li>Dashboard complet</li>
            <li>Morning Brief vocal</li>
            <li>Rapports quotidiens</li>
            <li>Support email</li>
          </ul>
          <button className="plan-btn plan-btn-secondary" onClick={() => handleCTA("monthly")}>
            {selectedPlan === "monthly" ? "Sélectionné!" : "Commencer"}
          </button>
        </div>

        {/* Founders Annual — FEATURED */}
        <div className={`plan-card plan-featured ${selectedPlan === "founders" ? "plan-selected" : ""}`}>
          <div className="plan-badge-top">MEILLEURE VALEUR</div>
          <div className="plan-name">Fondateurs</div>
          <div className="plan-price">
            <span className="plan-amount">$99</span>
            <span className="plan-period">/an</span>
          </div>
          <div className="plan-savings">Économisez $129 vs mensuel! + Prix bloqué à vie</div>
          <div className="plan-desc">Le prix de $99/an est <strong>bloqué à vie</strong> pour les fondateurs — même quand le prix régulier monte à $149.</div>
          <ul className="plan-features">
            <li>Tout du plan mensuel</li>
            <li>Prix $99/an à vie</li>
            <li>Badge "Fondateur" exclusif</li>
            <li>Accès anticipé aux nouvelles fonctions</li>
            <li>Support prioritaire</li>
            <li>1 mois gratuit inclus</li>
          </ul>
          <button className="plan-btn plan-btn-primary" onClick={() => handleCTA("founders")}>
            {selectedPlan === "founders" ? "Sélectionné!" : "Rejoindre les Fondateurs"}
          </button>
          <div className="plan-note">{foundersLeft} places seulement</div>
        </div>

        {/* Annual Regular */}
        <div className={`plan-card ${selectedPlan === "annual" ? "plan-selected" : ""}`}>
          <div className="plan-name">Annuel</div>
          <div className="plan-price">
            <span className="plan-amount">$149</span>
            <span className="plan-period">/an</span>
          </div>
          <div className="plan-savings">Économisez $79 vs mensuel</div>
          <div className="plan-desc">Le meilleur rapport qualité/prix après l'offre Fondateurs.</div>
          <ul className="plan-features">
            <li>Tout du plan mensuel</li>
            <li>2 mois offerts</li>
            <li>Support prioritaire</li>
            <li>Renouvellement à $119/an</li>
          </ul>
          <button className="plan-btn plan-btn-secondary" onClick={() => handleCTA("annual")}>
            {selectedPlan === "annual" ? "Sélectionné!" : "Choisir Annuel"}
          </button>
          <div className="plan-note">Renouvellement fidélité: $119/an</div>
        </div>

      </div>

      {/* Free Trial Banner */}
      <div className="trial-banner">
        <div className="trial-content">
          <div className="trial-icon"></div>
          <div>
            <div className="trial-title">1 Mois Gratuit — Sans carte de crédit</div>
            <div className="trial-sub">Essayez FollowBoss pendant 30 jours, zéro risque. Annulez en 1 clic.</div>
          </div>
          <button className="plan-btn plan-btn-trial" onClick={() => handleCTA("trial")}>
            {trialStarted ? "Essai activé!" : "Démarrer l'essai gratuit"}
          </button>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="roi-section">
        <h3>Calcul rapide du retour sur investissement</h3>
        <div className="roi-grid">
          <div className="roi-card">
            <div className="roi-icon"></div>
            <div className="roi-label">1 devis récupéré</div>
            <div className="roi-value">$500</div>
            <div className="roi-note">= 5 ans de FollowBoss Fondateurs</div>
          </div>
          <div className="roi-card">
            <div className="roi-icon"></div>
            <div className="roi-label">1 facture payée</div>
            <div className="roi-value">$1,200</div>
            <div className="roi-note">= 12 ans de FollowBoss</div>
          </div>
          <div className="roi-card">
            <div className="roi-icon"></div>
            <div className="roi-label">Augmentation revenus</div>
            <div className="roi-value">+29%</div>
            <div className="roi-note">Prouvé par les études</div>
          </div>
        </div>
      </div>

      {/* Guarantee */}
      <div className="guarantee-section">
        <div className="guarantee-icon"></div>
        <div>
          <div className="guarantee-title">Garantie 30 jours — Satisfait ou Remboursé</div>
          <div className="guarantee-sub">Si FollowBoss ne récupère pas au moins une relance pour vous dans les 30 premiers jours, on vous rembourse intégralement. Aucune question posée.</div>
        </div>
      </div>

      <style>{`
        .pricing-page { padding: 2rem 1rem; max-width: 1100px; margin: 0 auto; }
        .pricing-header { text-align: center; margin-bottom: 2rem; }
        .pricing-badge { display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 0.4rem 1.2rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        .pricing-header h1 { font-size: 2rem; font-weight: 800; color: white; margin-bottom: 0.75rem; }
        .pricing-sub { color: #b8c4d0; font-size: 1rem; }
        .gradient-text { background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .founders-banner { background: linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3)); border: 1px solid rgba(124,58,237,0.5); border-radius: 16px; padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
        .founders-left-col { display: flex; align-items: center; gap: 1rem; }
        .founders-icon { font-size: 2rem; }
        .founders-title { color: white; font-weight: 700; font-size: 1rem; }
        .founders-sub { color: #c4b5fd; font-size: 0.875rem; }
        .founders-timer { display: flex; gap: 0.5rem; }
        .timer-block { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 0.5rem 0.75rem; text-align: center; min-width: 52px; }
        .timer-num { color: #a78bfa; font-size: 1.5rem; font-weight: 800; line-height: 1; }
        .timer-label { color: #b8c4d0; font-size: 0.65rem; text-transform: uppercase; margin-top: 2px; }

        .founders-progress-wrap { margin-bottom: 2rem; }
        .founders-progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; }
        .founders-progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #4f46e5); border-radius: 999px; transition: width 1s ease; }
        .founders-progress-label { color: #b8c4d0; font-size: 0.8rem; margin-top: 0.4rem; text-align: right; }

        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .plan-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; position: relative; transition: transform 0.2s, border-color 0.2s; }
        .plan-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.5); }
        .plan-featured { background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.2)); border: 2px solid rgba(124,58,237,0.6); transform: scale(1.02); }
        .plan-selected { border-color: #10b981 !important; box-shadow: 0 0 20px rgba(16,185,129,0.3); }
        .plan-badge-top { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; font-size: 0.75rem; font-weight: 700; padding: 0.3rem 1rem; border-radius: 999px; white-space: nowrap; }
        .plan-name { color: #a78bfa; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
        .plan-price { margin-bottom: 0.5rem; }
        .plan-amount { color: white; font-size: 2.5rem; font-weight: 800; }
        .plan-period { color: #b8c4d0; font-size: 1rem; }
        .plan-savings { color: #10b981; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.75rem; }
        .plan-desc { color: #b8c4d0; font-size: 0.875rem; margin-bottom: 1.25rem; line-height: 1.5; }
        .plan-features { list-style: none; padding: 0; margin: 0 0 1.5rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .plan-features li { color: #e2e8f0; font-size: 0.875rem; }
        .plan-btn { width: 100%; padding: 0.875rem; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; }
        .plan-btn-primary { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; }
        .plan-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .plan-btn-secondary { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
        .plan-btn-secondary:hover { background: rgba(255,255,255,0.15); }
        .plan-note { color: #b8c4d0; font-size: 0.75rem; text-align: center; margin-top: 0.75rem; }

        .trial-banner { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15)); border: 1px solid rgba(16,185,129,0.3); border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; }
        .trial-content { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .trial-icon { font-size: 2.5rem; }
        .trial-title { color: white; font-weight: 700; font-size: 1.1rem; }
        .trial-sub { color: #b8c4d0; font-size: 0.875rem; margin-top: 0.25rem; }
        .plan-btn-trial { background: linear-gradient(135deg, #10b981, #059669); color: white; white-space: nowrap; width: auto; padding: 0.875rem 1.5rem; }
        .plan-btn-trial:hover { opacity: 0.9; }

        .roi-section { margin-bottom: 2rem; }
        .roi-section h3 { color: white; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; text-align: center; }
        .roi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .roi-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.5rem; text-align: center; }
        .roi-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .roi-label { color: #b8c4d0; font-size: 0.8rem; margin-bottom: 0.5rem; }
        .roi-value { color: #10b981; font-size: 2rem; font-weight: 800; margin-bottom: 0.25rem; }
        .roi-note { color: #8a96a8; font-size: 0.75rem; }

        .guarantee-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; }
        .guarantee-icon { font-size: 2.5rem; }
        .guarantee-title { color: white; font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
        .guarantee-sub { color: #b8c4d0; font-size: 0.875rem; line-height: 1.5; }

        @media (max-width: 600px) {
          .founders-banner { flex-direction: column; align-items: flex-start; }
          .trial-content { flex-direction: column; align-items: flex-start; }
          .guarantee-section { flex-direction: column; }
          .plan-featured { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
