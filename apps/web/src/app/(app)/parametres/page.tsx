'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Link2 } from 'lucide-react';

const MOCK_RESTAURANT = {
  nom: 'Le Comptoir',
  adresse: '12 rue de la Paix, 75002 Paris',
  typeEtablissement: 'Restaurant',
  horaires: '11h30-14h30, 19h-22h',
};

const MOCK_POS = { connecte: true, type: 'Lightspeed', lastSync: 'Il y a 5 min' };

const MOCK_SEUILS = { critique: 10, attention: 25 };
const MOCK_NOTIF = { push: true, sms: false, email: true };
const MOCK_USERS = [
  { id: '1', name: 'Marie Dupont', role: 'Admin', email: 'marie@lecomptoir.fr' },
  { id: '2', name: 'Jean Martin', role: 'Utilisateur', email: 'jean@lecomptoir.fr' },
];

export default function ParametresPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [nom, setNom] = useState(MOCK_RESTAURANT.nom);
  const [adresse, setAdresse] = useState(MOCK_RESTAURANT.adresse);
  const [typeEtablissement, setTypeEtablissement] = useState(MOCK_RESTAURANT.typeEtablissement);
  const [horaires, setHoraires] = useState(MOCK_RESTAURANT.horaires);
  const [seuilCritique, setSeuilCritique] = useState(String(MOCK_SEUILS.critique));
  const [seuilAttention, setSeuilAttention] = useState(String(MOCK_SEUILS.attention));
  const [push, setPush] = useState(MOCK_NOTIF.push);
  const [sms, setSms] = useState(MOCK_NOTIF.sms);
  const [email, setEmail] = useState(MOCK_NOTIF.email);
  const [langue, setLangue] = useState('fr');
  const [fuseau, setFuseau] = useState('Europe/Paris');

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/parametres');
  }, [token, isLoading, router]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-8 p-4 pb-24 md:pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Paramètres du restaurant</h1>
          <p className="text-sm text-gray-warm">Informations, intégrations et préférences</p>
        </div>

        {/* Infos générales */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Informations générales</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="param-nom" className="block text-sm font-medium text-charcoal">
                Nom du restaurant
              </label>
              <input
                id="param-nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="param-adresse" className="block text-sm font-medium text-charcoal">
                Adresse
              </label>
              <input
                id="param-adresse"
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="param-type" className="block text-sm font-medium text-charcoal">
                Type d&apos;établissement
              </label>
              <select
                id="param-type"
                value={typeEtablissement}
                onChange={(e) => setTypeEtablissement(e.target.value)}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Brasserie">Brasserie</option>
                <option value="Fast-food">Fast-food</option>
                <option value="Traiteur">Traiteur</option>
                <option value="Bar">Bar</option>
              </select>
            </div>
            <div>
              <label htmlFor="param-horaires" className="block text-sm font-medium text-charcoal">
                Horaires d&apos;ouverture
              </label>
              <input
                id="param-horaires"
                type="text"
                value={horaires}
                onChange={(e) => setHoraires(e.target.value)}
                placeholder="ex. 11h30-14h30, 19h-22h"
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            className="mt-4 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white"
          >
            Enregistrer
          </button>
        </section>

        {/* Intégrations POS */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Intégrations caisse (POS)</h2>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-green-deep/10 bg-cream/30 p-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-green-mid" />
              <div>
                <p className="font-medium text-charcoal">Lightspeed</p>
                <p className="text-sm text-gray-warm">
                  {MOCK_POS.connecte ? `Connecté · ${MOCK_POS.lastSync}` : 'Non connecté'}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                MOCK_POS.connecte ? 'bg-green-mid/20 text-green-deep' : 'bg-gray-warm/20 text-gray-warm'
              }`}
            >
              {MOCK_POS.connecte ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-warm">Saisie manuelle toujours disponible en secours.</p>
        </section>

        {/* Seuils alertes */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Seuils d&apos;alerte stock</h2>
          <p className="mt-1 text-sm text-gray-warm">En % du stock de référence — déclenchement des alertes Rush</p>
          <div className="mt-4 flex gap-6">
            <div>
              <label htmlFor="param-seuil-critique" className="block text-sm font-medium text-charcoal">
                Seuil critique (%)
              </label>
              <input
                id="param-seuil-critique"
                type="number"
                min="0"
                max="100"
                value={seuilCritique}
                onChange={(e) => setSeuilCritique(e.target.value)}
                className="mt-1 w-24 rounded-lg border border-green-deep/20 bg-white px-3 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="param-seuil-attention" className="block text-sm font-medium text-charcoal">
                Seuil attention (%)
              </label>
              <input
                id="param-seuil-attention"
                type="number"
                min="0"
                max="100"
                value={seuilAttention}
                onChange={(e) => setSeuilAttention(e.target.value)}
                className="mt-1 w-24 rounded-lg border border-green-deep/20 bg-white px-3 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Notifications</h2>
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">Push (navigateur)</span>
              <input
                type="checkbox"
                checked={push}
                onChange={(e) => setPush(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">SMS</span>
              <input
                type="checkbox"
                checked={sms}
                onChange={(e) => setSms(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">Email</span>
              <input
                type="checkbox"
                checked={email}
                onChange={(e) => setEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
          </div>
        </section>

        {/* Gestion utilisateurs */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Utilisateurs</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_USERS.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-green-deep/10 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{u.name}</p>
                  <p className="text-xs text-gray-warm">{u.email}</p>
                </div>
                <span className="rounded-full bg-green-deep/10 px-2 py-0.5 text-xs font-medium text-green-deep">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 rounded-lg border border-green-deep/20 px-4 py-2 text-sm font-medium text-green-deep"
          >
            Inviter un utilisateur
          </button>
        </section>

        {/* Langue / Fuseau */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Langue et fuseau</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="param-langue" className="block text-sm font-medium text-charcoal">
                Langue
              </label>
              <select
                id="param-langue"
                value={langue}
                onChange={(e) => setLangue(e.target.value)}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div>
              <label htmlFor="param-fuseau" className="block text-sm font-medium text-charcoal">
                Fuseau horaire
              </label>
              <select
                id="param-fuseau"
                value={fuseau}
                onChange={(e) => setFuseau(e.target.value)}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        </section>

        {/* Export RGPD */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Données personnelles (RGPD)</h2>
          <p className="mt-1 text-sm text-gray-warm">
            Téléchargez une copie de vos données ou demandez la suppression du compte.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-green-deep/20 px-4 py-2.5 text-sm font-medium text-green-deep"
          >
            <Download className="h-4 w-4" />
            Exporter mes données
          </button>
        </section>
      </div>
    </div>
  );
}
