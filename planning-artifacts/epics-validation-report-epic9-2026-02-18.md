# Rapport de validation des Epics et Stories — Epic 9

**Date :** 2026-02-18  
**Mode :** Validate Epics and Stories (VE)  
**Rôle :** John, Product Manager  
**Périmètre :** Epic 9 — Migration Full-Stack vers Next.js & UI Professionnelle

---

## 1. Synthèse

| Critère | Statut | Commentaire |
|---------|--------|-------------|
| Couverture exigences | ✅ | Epic 9 mappe sur front-end-spec, NFR9, et exigences UX non couvertes par les FRs PRD |
| Qualité des stories | ✅ | 5 stories avec AC complets, format Given/When/Then |
| Dépendances entre stories | ✅ | Ordre 9.1 → 9.2 → 9.3 → 9.4 → 9.5 cohérent |
| Indépendance de l'Epic | ⚠️ | Dépend de Epic 8 (Tailwind) et de l’API existante — documenté |
| Structure Epic | ✅ | Valeur utilisateur claire, stories actionnables |

**Verdict :** Epic 9 et ses stories sont **validés pour le développement**. Quelques recommandations mineures (section 5).

---

## 2. Couverture des exigences

### 2.1 Mapping Epic 9 → Exigences

L’Epic 9 est une **épic de migration/refonte** et ne mappe pas directement sur des FR du PRD. Elle couvre :

| Source | Exigences couvertes |
|--------|---------------------|
| **docs/front-end-spec.md** | §4.4 Session expirée 401/403 ; §3.2 Navigation ; §4.1 Dashboard actionnable ; §6 Skeleton ; §10 Animations |
| **NFR9** | Accessibilité navigateurs, responsive |
| **Document epic-9-migration-nextjs.md** | Problèmes identifiés : JWT exposé, fragmentation, interactions manuelles |

**Recommandation :** Ajouter dans `planning-artifacts/epics.md` une ligne dans le FR Coverage Map pour Epic 9, par exemple :

```
Epic 9: Exigences UX (front-end-spec §4.4, §3.2, §4.1, §6, §10), NFR9, Migration SPA Next.js
```

### 2.2 Couverture par story

| Story | Exigences adressées |
|-------|---------------------|
| 9.1 | front-end-spec §4.4 (401/403), suppression champs JWT |
| 9.2 | front-end-spec §3.2 (nav), layout partagé |
| 9.3 | front-end-spec §4.1 (dashboard actionnable), §6 (Skeleton) |
| 9.4 | Tableaux Fournisseurs, Emplacements, Ventes — épics 2 et 3 |
| 9.5 | front-end-spec §4.3 (courbes), FR14 (prévisions), stats |

---

## 3. Qualité des stories

### 3.1 Format et critères d’acceptation

- **9.1 à 9.5** : Format As a / I want / So that respecté  
- **AC** : Given/When/Then présents et actionnables  
- **Tasks / Dev Notes** : Présents dans les fichiers story pour le développement

### 3.2 Critères step-04

| Critère | 9.1 | 9.2 | 9.3 | 9.4 | 9.5 |
|---------|-----|-----|-----|-----|-----|
| Réalisable par un seul dev | ✅ | ✅ | ✅ | ✅ | ✅ |
| AC clairs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Références techniques | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pas de dépendance vers l’avant | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Dépendances

### 4.1 Ordre des stories

```
9.1 (Auth) → 9.2 (Layout) → 9.3 (Dashboard) → 9.4 (Tableaux) → 9.5 (Graphiques)
```

- 9.1 fournit AuthProvider / useApi  
- 9.2 fournit le layout utilisé par 9.3, 9.4, 9.5  
- 9.3, 9.4, 9.5 sont parallélisables après 9.2 (en limitant les conflits)

### 4.2 Dépendances externes

- **Epic 8** : Charte Tailwind et layout actuel — Epic 9 introduit un nouveau front Next.js, coexistence possible pendant la migration.
- **API Express** : Conservée comme backend ; pas de modification côté API pour Epic 9.

---

## 5. Recommandations

1. **Mise à jour du FR Coverage Map** : ajouter une entrée explicite pour Epic 9 dans `planning-artifacts/epics.md`.  
2. **9.3 et 9.5** : préciser les routes API (`/api/dashboard/*`, `/api/sales/summary`, etc.) une fois la spec API stabilisée.  
3. **sprint-status.yaml** : ajouter Epic 9 et ses stories dès que le sprint planning inclura cette épic.

---

## 6. Conclusion

L’Epic 9 — Migration Full-Stack vers Next.js & UI Professionnelle — et ses 5 stories sont **validées** et **prêtes pour le développement**. Les critères BMAD (couverture, qualité des stories, dépendances, structure) sont respectés.

**Prochaines étapes suggérées :**
- Intégrer Epic 9 dans le sprint planning si la migration Next.js est prioritaire.
- Mettre à jour le FR Coverage Map comme indiqué en 5.1.
