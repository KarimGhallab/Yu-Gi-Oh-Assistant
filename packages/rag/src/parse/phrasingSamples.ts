import { Language } from '@ygo-assistant/cards';

/**
 * Real card texts, shown to the parsing model as the register its rewrite has
 * to be written in. A model has no idea how Yu-Gi-Oh cards are worded, so a set
 * of genuine effects is what teaches it the vocabulary the index is written in:
 * "add ... from your GY to your hand", "Special Summon", "banish", "detach 1
 * material", "1 Tuner + 1 or more non-Tuner monsters".
 *
 * The set covers the kinds a request can ask for: five spells and traps, three
 * monsters, three Xyz and three Synchro monsters. Each text is held as the lines
 * it is written in, because the extra-deck kinds carry their summoning
 * condition on its own line. Each language's samples are that language's real
 * texts, because a rewrite in French has to match French card text.
 */
const SAMPLES: Record<Language, string[]> = {
  [Language.English]: [
    'Discard 2 cards, then target 1 Spell in your GY; add it to your hand.',
    'Target 1 monster in either GY; Special Summon it.',
    'Target 1 Spell/Trap on the field; destroy that target.',
    'Target up to 5 cards in any GY(s); banish them.',
    'When a Spell Card is activated: Discard 1 card; negate the activation, and if you do, destroy it.',
    'Target 1 monster on the field; destroy it.',
    "After damage calculation, when this card battles an opponent's monster: You can banish that monster, also banish this card.",
    'When a monster declares an attack: You can detach 1 material from this card; negate the attack. If this card is targeted for an attack, while it has no material: Destroy this card.',
    'Once per turn: You can detach 1 material from this card, then target 1 banished Level 4 or lower monster; Special Summon that target to your field.',
    'While this card has a material attached that was originally WATER, all WATER monsters you control gain 500 ATK. Once per turn (Quick Effect): You can detach 1 material from this card; your opponent cannot activate any card effects in their GY this turn.',
    'At the start of the Damage Step, if this card battles a face-up non-DARK monster: Destroy that monster.',
    "When this card is Synchro Summoned: You can draw 1 card. Once per Chain, during your opponent's Main Phase, you can (Quick Effect): Immediately after this effect resolves, Synchro Summon using this card you control.",
    'All monsters your opponent controls become Dragon-Type. Once per turn, if you do not control a "Buster Blader" monster: You can target 1 "Buster Blader" in your Graveyard; Special Summon it. Once per turn, during your opponent\'s turn: You can target 1 "Buster Blader" monster you control; equip it with 1 "Destruction Sword" monster from your Graveyard (this is a Quick Effect).',
    `You can Ritual Summon this card with "Light and Darkness Ritual". Unaffected by your opponent's activated effects, unless they target this card, also cannot be destroyed by battle. You can only use each of the following effects of "Black Luster Soldier - Soldier of Light and Darkness" once per turn. If this card is Special Summoned: You can target 1 card your opponent controls; banish it. When this card destroys an opponent's monster by battle: You can make this card gain 1500 ATK, and if you do, it can make a second attack in a row.`
  ],
  [Language.French]: [
    'Défaussez 2 cartes, puis ciblez 1 Magie dans votre Cimetière ; ajoutez-la à votre main.',
    "Ciblez 1 monstre dans l'un des Cimetières ; Invoquez-le Spécialement.",
    'Ciblez 1 Magie/Piège sur le Terrain ; détruisez la cible.',
    'Ciblez max. 5 cartes dans les Cimetières ; bannissez-les.',
    "Lorsqu'une Carte Magie est activée : défaussez 1 carte ; annulez l'activation, et si vous le faites, détruisez-la.",
    'Ciblez 1 monstre sur le Terrain ; détruisez-le.',
    "Après le calcul des dommages, lorsque cette carte combat un monstre de l'adversaire : vous pouvez bannir le monstre, et aussi, bannissez cette carte.",
    "Lorsqu'un monstre déclare une attaque : vous pouvez détacher 1 Matériel de cette carte ; annulez l'attaque. Si cette carte est ciblée par une attaque, tant qu'elle n'a pas de Matériel : détruisez cette carte.",
    'Une fois par tour : vous pouvez détacher 1 Matériel de cette carte, puis ciblez 1 monstre de max. Niveau 4 banni ; Invoquez Spécialement la cible sur votre Terrain.',
    "Tant que cette carte a un Matériel attaché qui était EAU à l'origine, tous les monstres EAU que vous contrôlez gagnent 500 ATK. Une fois par tour (Effet Rapide) : vous pouvez détacher 1 Matériel de cette carte ; ce tour, votre adversaire ne peut pas activer d'effets de carte dans son Cimetière.",
    'Au début de la Damage Step, si cette carte combat un monstre non-TÉNÈBRES face recto : détruisez le monstre.',
    'Lorsque cette carte est Invoquée par Synchronisation : vous pouvez piocher 1 carte. Une fois par Chaîne, durant la Main Phase de votre adversaire, vous pouvez (Effet Rapide) : immédiatement après la résolution de cet effet, Invoquez par Synchronisation en utilisant cette carte que vous contrôlez.',
    'Tous les monstres contrôlés par votre adversaire deviennent Dragon. Une fois par tour, si vous ne contrôlez aucun monstre "Buster Blader" : vous pouvez cibler 1 "Buster Blader" dans votre Cimetière ; Invoquez-le Spécialement. Une fois par tour de l\'adversaire (Effet Rapide) : vous pouvez cibler 1 monstre "Buster Blader" que vous contrôlez ; équipez-le avec 1 monstre "Épée Destructrice" depuis votre Cimetière.',
    `Vous pouvez Invoquer Rituellement cette carte avec "Rituel de la Lumière et des Ténèbres". Non affectée par les effets activés de votre adversaire, sauf s'ils ciblent cette carte, et aussi, non destructible au combat. Vous ne pouvez utiliser chacun des effets suivants de "Soldat du Lustre Noir - Soldat de la Lumière et des Ténèbres" qu'une fois par tour. Si cette carte est Invoquée Spécialement : vous pouvez cibler 1 carte contrôlée par votre adversaire ; bannissez-la. Lorsque cette carte détruit un monstre de l'adversaire au combat : vous pouvez faire gagner 1500 ATK à cette carte, et si vous le faites, elle peut faire une seconde attaque à la suite.`
  ]
};

/**
 * The card texts that show what a rewrite has to sound like, each as the lines
 * the card is written in.
 */
export function phrasingSamples(language: Language): string[] {
  return SAMPLES[language];
}
