import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Business, 
  BusinessLocation, 
  Product, 
  BusinessReview,
  BusinessStats,
  BusinessFormData, 
  BusinessLocationFormData, 
  ProductFormData,
  BusinessReviewFormData,
  BusinessFilters,
  ProductFilters
} from '@/types/business';

// Servicios para Comercios
export const businessService = {
  // Crear comercio
  async createBusiness(userId: string, businessData: BusinessFormData): Promise<string> {
    try {
      const businessRef = await addDoc(collection(db, 'businesses'), {
        ...businessData,
        userId,
        estado: 'pendiente',
        verificado: false,
        calificacion: 0,
        totalReviews: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return businessRef.id;
    } catch (error) {
      console.error('Error creating business:', error);
      throw error;
    }
  },

  // Obtener comercio por usuario
  async getBusinessByUserId(userId: string): Promise<Business | null> {
    try {
      const q = query(
        collection(db, 'businesses'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as Business;
    } catch (error) {
      console.error('Error getting business by user:', error);
      throw error;
    }
  },

  // Obtener comercio por ID
  async getBusinessById(businessId: string): Promise<Business | null> {
    try {
      const docRef = doc(db, 'businesses', businessId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as Business;
      }
      return null;
    } catch (error) {
      console.error('Error getting business:', error);
      throw error;
    }
  },

  // Obtener todos los comercios con filtros
  async getBusinesses(filters: BusinessFilters = {}): Promise<Business[]> {
    try {
      let q = query(collection(db, 'businesses'));

      // Aplicar filtros
      if (filters.categoria) {
        q = query(q, where('categoria', '==', filters.categoria));
      }
      if (filters.ciudad) {
        q = query(q, where('ciudad', '==', filters.ciudad));
      }
      if (filters.verificado !== undefined) {
        q = query(q, where('verificado', '==', filters.verificado));
      }

      q = query(q, orderBy('calificacion', 'desc'), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Business[];
    } catch (error) {
      console.error('Error getting businesses:', error);
      throw error;
    }
  },

  // Actualizar comercio
  async updateBusiness(businessId: string, businessData: Partial<BusinessFormData>): Promise<void> {
    try {
      const docRef = doc(db, 'businesses', businessId);
      await updateDoc(docRef, {
        ...businessData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  },

  // Obtener estadísticas del comercio
  async getBusinessStats(businessId: string): Promise<BusinessStats> {
    try {
      // Obtener productos y servicios
      const productsQuery = query(
        collection(db, 'products'),
        where('businessId', '==', businessId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      let totalProductos = 0;
      let totalServicios = 0;
      let productosDestacados = 0;

      productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        if (product.tipo === 'producto') totalProductos++;
        if (product.tipo === 'servicio') totalServicios++;
        if (product.destacado) productosDestacados++;
      });

      // Obtener reviews
      const reviewsQuery = query(
        collection(db, 'businessReviews'),
        where('businessId', '==', businessId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      const totalReviews = reviewsSnapshot.size;
      let sumaCalificaciones = 0;
      
      reviewsSnapshot.docs.forEach(doc => {
        sumaCalificaciones += doc.data().calificacion;
      });

      const calificacionPromedio = totalReviews > 0 ? sumaCalificaciones / totalReviews : 0;

      return {
        totalProductos,
        totalServicios,
        totalVentas: 0, // TODO: Implementar cuando tengamos sistema de ventas
        ventasMes: 0,
        calificacionPromedio,
        totalReviews,
        productosDestacados,
        visitasPerfil: 0 // TODO: Implementar analytics
      };
    } catch (error) {
      console.error('Error getting business stats:', error);
      throw error;
    }
  }
};

// Servicios para Ubicaciones de Comercios
export const businessLocationService = {
  // Crear ubicación
  async createLocation(businessId: string, locationData: BusinessLocationFormData): Promise<string> {
    try {
      const locationRef = await addDoc(collection(db, 'businessLocations'), {
        ...locationData,
        businessId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return locationRef.id;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  },

  // Obtener ubicaciones de un comercio
  async getBusinessLocations(businessId: string): Promise<BusinessLocation[]> {
    try {
      const q = query(
        collection(db, 'businessLocations'),
        where('businessId', '==', businessId),
        orderBy('esPrincipal', 'desc'),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as BusinessLocation[];
    } catch (error) {
      console.error('Error getting business locations:', error);
      throw error;
    }
  },

  // Actualizar ubicación
  async updateLocation(locationId: string, locationData: Partial<BusinessLocationFormData>): Promise<void> {
    try {
      const docRef = doc(db, 'businessLocations', locationId);
      await updateDoc(docRef, {
        ...locationData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  // Eliminar ubicación
  async deleteLocation(locationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'businessLocations', locationId));
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }
};

// Servicios para Productos
export const productService = {
  // Crear producto
  async createProduct(businessId: string, productData: ProductFormData): Promise<string> {
    try {
      const productRef = await addDoc(collection(db, 'products'), {
        ...productData,
        businessId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return productRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Obtener productos de un comercio
  async getBusinessProducts(businessId: string): Promise<Product[]> {
    try {
      const q = query(
        collection(db, 'products'),
        where('businessId', '==', businessId),
        orderBy('destacado', 'desc'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Product[];
    } catch (error) {
      console.error('Error getting business products:', error);
      throw error;
    }
  },

  // Obtener todos los productos con filtros
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    try {
      let q = query(collection(db, 'products'));

      // Aplicar filtros
      if (filters.categoria) {
        q = query(q, where('categoria', '==', filters.categoria));
      }
      if (filters.tipo) {
        q = query(q, where('tipo', '==', filters.tipo));
      }
      if (filters.disponible !== undefined) {
        q = query(q, where('disponible', '==', filters.disponible));
      }
      if (filters.destacado !== undefined) {
        q = query(q, where('destacado', '==', filters.destacado));
      }

      q = query(q, orderBy('destacado', 'desc'), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Product[];
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  },

  // Obtener producto por ID
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as Product;
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  },

  // Actualizar producto
  async updateProduct(productId: string, productData: Partial<ProductFormData>): Promise<void> {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        ...productData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Eliminar producto
  async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

// Servicios para Reviews
export const reviewService = {
  // Crear review
  async createReview(businessId: string, userId: string, userName: string, reviewData: BusinessReviewFormData): Promise<string> {
    try {
      const reviewRef = await addDoc(collection(db, 'businessReviews'), {
        ...reviewData,
        businessId,
        userId,
        userName,
        createdAt: Timestamp.now()
      });

      // Actualizar estadísticas del comercio
      await this.updateBusinessRating(businessId);
      
      return reviewRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  // Obtener reviews de un comercio
  async getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
    try {
      const q = query(
        collection(db, 'businessReviews'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        fechaRespuesta: doc.data().fechaRespuesta?.toDate()
      })) as BusinessReview[];
    } catch (error) {
      console.error('Error getting business reviews:', error);
      throw error;
    }
  },

  // Actualizar calificación del comercio
  async updateBusinessRating(businessId: string): Promise<void> {
    try {
      const reviewsQuery = query(
        collection(db, 'businessReviews'),
        where('businessId', '==', businessId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      const totalReviews = reviewsSnapshot.size;
      let sumaCalificaciones = 0;
      
      reviewsSnapshot.docs.forEach(doc => {
        sumaCalificaciones += doc.data().calificacion;
      });

      const calificacionPromedio = totalReviews > 0 ? sumaCalificaciones / totalReviews : 0;

      // Actualizar el comercio
      const businessRef = doc(db, 'businesses', businessId);
      await updateDoc(businessRef, {
        calificacion: calificacionPromedio,
        totalReviews: totalReviews,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating business rating:', error);
      throw error;
    }
  }
};
