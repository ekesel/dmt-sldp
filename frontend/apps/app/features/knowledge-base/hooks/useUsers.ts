import { useQuery } from "@tanstack/react-query";
import { usersOptions } from "../api/query-options";

export const useUsers = () => {
  const managersQuery = useQuery(usersOptions());

  return {
    managers: managersQuery.data || [],
    isLoading: managersQuery.isLoading,
    isError: managersQuery.isError,
  };
};
