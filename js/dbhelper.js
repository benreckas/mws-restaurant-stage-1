/**
 * Common database helper functions.
 */

/**
 * Import IndexedDB
 */
const dbPromise = idb.open("restaurant-review-db", 1, upgradeDB => {
  /** Resturant Data */
  const restaurantStore = upgradeDB.createObjectStore('restaurants', { keyPath: 'id' });
  restaurantStore.createIndex('by-neighborhood', 'neighborhood');
  restaurantStore.createIndex('by-cuisine', 'cuisine_type');

  /** Review Data */
  const reviewStore = upgradeDB.createObjectStore("reviews", {keyPath: "id"});
  reviewStore.createIndex("restaurant_id", "restaurant_id");

  /** Pending Data */
  upgradeDB.createObjectStore("pending", {
    keyPath: "id",
    autoIncrement: true
  });
});

class DBHelper {
  static get DATABASE_URL() {
    // LOCAL:
    // const port = 5500
    // return `http://localhost:${port}/data/restaurants.json`;

    // SERVER API:
    const port = 1337;
    return `http://localhost:${port}/restaurants/`
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    /* Fetch Options */
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    /* IndexDB */
    const dbPromise = idb.open("restaurant-review-db");

    dbPromise
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const resp = tx.objectStore('restaurants');
        return resp.getAll();
      })
      .then(restaurants => {
        if(restaurants.length !== 0) {
          callback(null, restaurants)
        } else {
          fetch(DBHelper.DATABASE_URL, options)
            .then(resp => resp.json())
            .then(restaurants => {
              dbPromise.then(db => {
                const tx = db.transaction('restaurants', 'readwrite');
                const resp = tx.objectStore('restaurants');
                restaurants.forEach(restaurant => resp.put(restaurant));
                callback(null, restaurants);
                return tx.complete;
              });
            })
            .catch(error => callback(error, null));
        }
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}-400.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Queue items when offline, Send them when online connection is detected
   */
  static addPendingRequestToQueue(url, options) {
    const dbPromise = idb.open("restaurant-review-db");

    dbPromise
      .then(db => {
        const tx = db.transaction("pending", "readwrite");
        tx
          .objectStore("pending")
          .put({
            data: {
              url,
              options
            }
          })
      })
      .catch(error => console.log(error));
  }

  static sendCachedRequests() {
    const dbPromise = idb.open("restaurant-review-db");

    dbPromise.then(db => {
      if (!db.objectStoreNames.length) {
        console.log("DB not available");
        db.close();
        return;
      }

      const tx = db.transaction("pending", "readwrite");
      tx
        .objectStore("pending")
        .iterateCursor(cursor => {
          const value = cursor.value;
          const url = value.data.url;
          const options = value.data.options;

          if (!cursor) {
            return;
          }

          if (!url || !options) {
            cursor.delete()
            return;
          };

          fetch(url, options)
            .then(resp => {
              if(!resp.ok && !resp.redirected) { return }
            })
            .then(() => {
              const deltx = db.transaction("pending", "readwrite");
              deltx
                .objectStore("pending")
                .openCursor()
                .then(cursor => cursor.delete());
            });

          cursor.continue();
        })
        .catch(error => console.log(error));
    });
  }

  /**
   * Toggle Favorite Restaurant
   */
  static setIsFavorite(isFavorite, id) {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/restaurants/${id}/?is_favorite=${isFavorite}`;

    fetch(url, options)
    .then(console.log('Success!'))
    .catch(error => {
      DBHelper.addPendingRequestToQueue(url, options);
      callback(error, null);
    });
  }

  /**
   * Fetch all Restaurant Reviews by Id
   */
  static fetchAllRestaurantReviews(id, callback) {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/reviews/?restaurant_id=${id}`;

    fetch(url, options)
      .then(resp => resp.json())
      .then(reviews => {
        const dbPromise = idb.open("restaurant-review-db");

        dbPromise.then(db => {
          const tx = db.transaction('reviews', 'readwrite');
          const resp = tx.objectStore('reviews');
          reviews.forEach(review => resp.put(review));
          tx.complete;
        });

        callback(null, reviews);
      })
      .catch(error => callback(error, null));
  }

  /**
   * Update Review by Id
   */
  static updateReviewById(id, data, callback) {
    const options = {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/reviews/${id}`;

    fetch(url, options)
      .then(resp => resp.json())
      .then(review => callback(null, review))
      .catch(error => {
        DBHelper.addPendingRequestToQueue(url, options);
        callback(error, null);
      });
  }

  static fetchReviewById(id, callback) {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/reviews/${id}`;

    fetch(url, options)
      .then(resp => resp.json())
      .then(review => callback(null, review))
      .catch(error => {
        DBHelper.addPendingRequestToQueue(url, options);
        callback(error, null);
      });
  }

  static addNewReview(data, callback) {
    const options = {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/reviews/`;

    fetch(url, options)
      .then(resp => resp.json())
      .then(review => callback(null, review))
      .catch(error => {
        DBHelper.addPendingRequestToQueue(url, options);
        callback(error, null);
      });
  }

  static deleteReviewById(id, callback) {
    const options = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    };
    const url = `http://localhost:1337/reviews/${id}`;

    fetch(url, options)
      .then(resp => resp.json())
      .then(success => callback(null, success))
      .catch(error => {
        DBHelper.addPendingRequestToQueue(url, options);
        callback(error, null);
      });
  }
}
