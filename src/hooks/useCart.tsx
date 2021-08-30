import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productInStock } = await api.get<Stock>(`/stock/${productId}`);

      const product = cart.find(product => product.id === productId);

      const productAmmount = product?.amount || 0;

      if (productInStock.amount < productAmmount + 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let updatedCart = [];

      if (!product) {
        const { data: productData } = await api.get<Product>(`/products/${productId}`);
        updatedCart = [...cart, { ...productData, amount: 1 }];
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        updatedCart = cart.map(item => {
          if (item.id === productId) {
            item.amount++;
          }
          return item;
        });

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if (!product) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(item => (item.id !== productId));

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: productInStock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount < 1) {
        return;
      }

      if (amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart(
        cart.map(item => {
          if (item.id === productId) {
            item.amount = amount;
          }
          return item;
        })
      );

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
