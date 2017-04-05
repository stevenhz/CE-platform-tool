"""
    analyze the relationship among factories, infrastructures with all the chemicals, emissions, utilities

    generate a 2D array:
             | chem1 chem2 chem3 chem4 emis1 emis2 utility1 ......
    ---------|---------------------------------------
    factory1 |   10
    factory2 |   -15
    factory3 |
    infra1   |
    infra2   |

    value > 0: factory produce/generate this item
    value < 0: factory use/recycle/treat this item
"""
import numpy as np
import itertools

SHORT_NAME_CHEMICAL = 'c'
SHORT_NAME_UTILITY_TYPE = 'u'
SHORT_NAME_EMISSION = 'e'
SHORT_NAME_FACTORY = 'f'


class CEAnalysis:
    OFFSET_FACTORY = 0
    OFFSET_CHEMICAL = 10000000
    OFFSET_UTILITY_TYPE = 20000000
    OFFSET_EMISSION = 30000000
    PREFIX_EMISSION = 'emis_'

    def __init__(self, all_factory, all_chemical, all_utility_type, all_emission):
        """
            create a dictionary to use their DB object_id + unique_offset as key, and internal increased Index as value
            and another dictionary to store the reversed (key,value) of the previous dictionary
        :param all_factory:
        :param all_chemical:
        :param all_utility_type:
        :param all_emission: {rf_id: EmissionData}
        :return:
        """
        # all the object_id + offset : internal index
        self.dict_obj_id_2_index = dict()
        # store the row_index : object_id + offset)
        self.dict_row_index_2_obj_id = dict()
        # store the col_index: object_id + offset)
        self.dict_col_index_2_obj_id = dict()

        # row: factory
        row_index = itertools.count(0)
        for factory_obj_id in all_factory.keys():
            unique_factory_id = CEAnalysis.__generate_unique_obj_id(factory_obj_id, SHORT_NAME_FACTORY)
            index = next(row_index)
            self.dict_obj_id_2_index[unique_factory_id] = index
            self.dict_row_index_2_obj_id[index] = unique_factory_id

        # column: chemicals
        col_index = itertools.count(0)
        for chem_obj_id in all_chemical.keys():
            unique_chem_id = CEAnalysis.__generate_unique_obj_id(chem_obj_id, SHORT_NAME_CHEMICAL)
            index = next(col_index)
            self.dict_obj_id_2_index[unique_chem_id] = index
            self.dict_col_index_2_obj_id[index] = unique_chem_id

        # column: utility types
        for utility_object_id in all_utility_type.keys():
            unique_utility_id = CEAnalysis.__generate_unique_obj_id(utility_object_id, SHORT_NAME_UTILITY_TYPE)
            index = next(col_index)
            self.dict_obj_id_2_index[unique_utility_id] = index
            self.dict_col_index_2_obj_id[index] = unique_utility_id

        # column: emissions, use emission name, not the object_id, since different object_id may point to the same
        # emission. The emission data is per reaction_formula related
        for emission_per_rf in all_emission.values():
            for emission_data in emission_per_rf:
                emission_name = CEAnalysis.__generate_unique_obj_id(emission_data.name, SHORT_NAME_EMISSION)
                if emission_name not in self.dict_obj_id_2_index:
                    index = next(col_index)
                    self.dict_obj_id_2_index[emission_name] = index
                    self.dict_col_index_2_obj_id[index] = emission_name

        n_rows = len(self.dict_row_index_2_obj_id)
        n_cols = len(self.dict_col_index_2_obj_id)
        assert(n_rows + n_cols == len(self.dict_obj_id_2_index))
        # create the 2D array
        self.A = np.zeros((n_rows, n_cols), dtype=np.float64)

    def get_factory_id_by_index(self, row_index):
        object_id = self.dict_row_index_2_obj_id.get(row_index) - CEAnalysis.OFFSET_FACTORY
        return object_id

    def get_object_id_by_index(self, col_index):
        """       
        :param col_index: column index of the 2D array
        :return: object_id from the database, which is used as dictionary key in their container respectively
        """
        object_id = self.dict_col_index_2_obj_id.get(col_index)
        if type(object_id) is int:
            if CEAnalysis.OFFSET_CHEMICAL < object_id < CEAnalysis.OFFSET_UTILITY_TYPE:
                return object_id, SHORT_NAME_CHEMICAL
            elif CEAnalysis.OFFSET_UTILITY_TYPE < object_id < CEAnalysis.OFFSET_EMISSION:
                return object_id, SHORT_NAME_UTILITY_TYPE
        else:
            # since the column name for emission starts with 'emis_', so we return a substring of the column name
            return object_id[5:], SHORT_NAME_EMISSION

    @staticmethod
    def __generate_unique_obj_id(object_id, name):
        unique_obj_id = object_id
        if name.lower() == SHORT_NAME_CHEMICAL:
            unique_obj_id = CEAnalysis.OFFSET_CHEMICAL + int(object_id)
        elif name.lower() == SHORT_NAME_FACTORY:
            unique_obj_id = CEAnalysis.OFFSET_FACTORY + int(object_id)
        elif name.lower() == SHORT_NAME_UTILITY_TYPE:
            unique_obj_id = CEAnalysis.OFFSET_UTILITY_TYPE + int(object_id)
        elif name.lower() == SHORT_NAME_EMISSION:
            unique_obj_id = CEAnalysis.PREFIX_EMISSION + object_id
        else:
            print("[Warning]: unknown name", name)
            raise ValueError("Unknown name to generate the column index")
        return unique_obj_id

    def get_index_by_id(self, object_id, name):
        """
        :param object_id: object_id or name(of emission) of the component from database
        :param name: indication of factory, emission ,utility and chemical
        :return: index of one axis of the 2D array 
        """
        unique_obj_id = CEAnalysis.__generate_unique_obj_id(object_id, name)
        # for emission, the object_id is actually the emission name, not an integer
        index = self.dict_obj_id_2_index.get(unique_obj_id)
        if index is None:
            raise ValueError("[Error]: no index found for " + str(unique_obj_id))
        return index

    def get_factory_ids_by_col_id(self, col_object_id, component_type_name, larger_than_zero):
        """
        with a known col_object_id, indicating as a chemical, emis, utility, return a list of factory id's
        :param col_object_id: 
        :param component_type_name: 
        :return: a list of factory_id which produce/supply the chemical or service indicated by the col_object_id
        """
        col_index = self.get_index_by_id(col_object_id, component_type_name)
        # in the array column, get all the entries whose value > 0, which means the factory produce/supply
        # this product or service
        a_column = self.A[:, col_index]
        if larger_than_zero:
            row_indices = np.where(a_column > 0)
        else:
            row_indices = np.where(a_column < 0)
        if len(row_indices[0]) > 0:
            factory_ids = [self.get_factory_id_by_index(i.item(0)) for i in np.nditer(row_indices[0])]
            return factory_ids
        else:
            return []

    def set_value(self, factory_obj_id, col_object_id, name, value):
        """       
        :param factory_obj_id: 
        :param col_object_id:  object_id of emission, utility or chemical
        :param name: indication of e(emission), u(utility) or c(chemical)
        :param value: 
        :return: 
        """
        row_index = self.get_index_by_id(factory_obj_id, SHORT_NAME_FACTORY)
        col_index = self.get_index_by_id(col_object_id, name)
        self.A[row_index, col_index] += value

    @property
    def json_format(self):
        return {'id2idx': self.dict_obj_id_2_index,
                'rIdx2id': self.dict_row_index_2_obj_id,
                'cIdx2id': self.dict_col_index_2_obj_id
                }

