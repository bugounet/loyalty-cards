type Props = {
  onAdd: () => void;
};

export function EmptyState({ onAdd }: Props) {
  return (
    <section className="empty-state">
      <div className="empty-initial" aria-hidden="true">
        F
      </div>
      <p className="eyebrow">Premiere carte</p>
      <h2>Aucune carte enregistree</h2>
      <p>Ajoute une carte de fidelite en quelques secondes. Elle restera stockee sur cet appareil.</p>
      <button className="primary-button" type="button" onClick={onAdd}>
        Ajouter une carte
      </button>
    </section>
  );
}
