# Documentation des Scripts Personnalisés Jinja

Ce document détaille les fonctions et variables personnalisées disponibles dans l'environnement Jinja2 pour les scripts associés aux tâches et aux projets dans Chronos.

## Contexte d'Exécution

Les scripts sont exécutés dans le contexte d'un objet, qui peut être une **Tâche** ou un **Projet**. Toutes les fonctions et variables décrites ci-dessous opèrent sur cet objet contextuel.

---

## Variables et Fonctions d'Accès aux Données

Ces variables et fonctions vous permettent de lire les données de l'objet courant.

### Attributs directs

-   `tags`: (Liste de chaînes) Liste des noms des tags associés.
-   `priority`: (Chaîne) Niveau de priorité (ex: '04 - Urgent').
-   `status`: (Chaîne) Statut actuel (ex: 'En cours').
-   `progress`: (Nombre) Le progrès calculé (pour les projets) ou défini (pour les tâches).

### Fonctions

-   `get_description()`: Renvoie la description de l'objet.
-   `get_remarque()`: Renvoie la remarque de l'objet (disponible uniquement pour les **Tâches**).
-   `get_attribute(key)`: Renvoie la valeur d'un attribut personnalisé.
    -   `key`: (Chaîne) Le nom de l'attribut.
-   `now(fmt="%Y-%m-%d %H:%M:%S")`: Renvoie la date et l'heure actuelles, formatées.
    -   `fmt`: (Chaîne, optionnel) Le format de la date/heure.
-   `deadline(fmt="%Y-%m-%d")`: Renvoie la date d'échéance de l'objet, formatée.
    -   `fmt`: (Chaîne, optionnel) Le format de la date.
-   `start_date(fmt="%Y-%m-%d")`: Renvoie la date de début de l'objet, formatée.
    -   `fmt`: (Chaîne, optionnel) Le format de la date.

---

## Fonctions d'Action

Ces fonctions modifient l'objet courant. Il est recommandé de les utiliser avec la balise `{% do %}`.

-   `set_description(description)`: Met à jour la description.
    -   `description`: (Chaîne) La nouvelle description.
-   `set_remarque(remarque)`: Met à jour la remarque (disponible uniquement pour les **Tâches**).
    -   `remarque`: (Chaîne) La nouvelle remarque.
-   `set_priority(priority)`: Change la priorité.
    -   `priority`: (Chaîne) La nouvelle priorité.
-   `set_status(status)`: Change le statut.
    -   `status`: (Chaîne) Le nouveau statut.
-   `set_progress(progress)`: Définit le progrès (pour les **Tâches** uniquement).
    -   `progress`: (Nombre) Une valeur entre 0 et 100.
-   `add_tag(tag_name)`: Ajoute un tag. Si le tag n'existe pas, il est créé.
    -   `tag_name`: (Chaîne) Le nom du tag.
-   `remove_tag(tag_name)`: Supprime un tag de l'objet.
    -   `tag_name`: (Chaîne) Le nom du tag.
-   `set_attribute(key, value)`: Définit un attribut personnalisé.
    -   `key`: (Chaîne) Le nom de l'attribut.
    -   `value`: (Chaîne) La valeur de l'attribut.
-   `remove_attribute(key)`: Supprime un attribut personnalisé.
    -   `key`: (Chaîne) Le nom de l'attribut.

---

## Fonctions d'Interaction Externe

-   `http_check(url)`: Exécute une requête HTTP GET et renvoie le code de statut.
    -   `url`: (Chaîne) L'URL à vérifier.
-   `http_is_alive(url)`: Vérifie si un service web est actif et renvoie des statistiques de disponibilité.
    -   `url`: (Chaîne) L'URL du service.
-   `notification(message, type)`: Envoie une notification à l'interface utilisateur.
    -   `message`: (Chaîne) Le contenu de la notification.
    -   `type`: (Chaîne) Le type de notification (ex: 'info', 'success', 'error').
-   `include_template(template_name)`: Inclut un autre script à partir des modèles de script.
    -   `template_name`: (Chaîne) Le nom du modèle de script à inclure.

---

## Structures de Contrôle

Vous pouvez utiliser les structures de contrôle standard de Jinja2 :

-   Conditions: `{% if condition %}` ... `{% elif condition %}` ... `{% else %}` ... `{% endif %}`
-   Boucles: `{% for item in liste %}` ... `{% endfor %}`
-   Assignation de variables: `{% set ma_variable = 'valeur' %}`
-   Actions sans sortie: `{% do ma_fonction() %}`

## Exemple de Script

```jinja
{# Met à jour le statut si la date d'échéance est passée #}
{% if deadline() and deadline() < now('%Y-%m-%d') %}
    {% do set_status('En retard') %}
    {% do add_tag('Urgent') %}
    {% do notification('Cette tâche est en retard !', 'error') %}
{% endif %}

{# Utilisation d'une fonction externe pour vérifier un site web #}
{% set resultat_check = http_is_alive('https://mon-site-web.com') %}
{% if resultat_check.failed > 0 %}
    {% do set_remarque("Le site web semble inaccessible.") %}
{% endif %}

```
